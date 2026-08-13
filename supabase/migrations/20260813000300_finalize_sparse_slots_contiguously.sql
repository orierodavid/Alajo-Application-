ALTER TABLE public.group_members
  ADD COLUMN IF NOT EXISTS payout_position integer;

ALTER TABLE public.group_members
  DROP CONSTRAINT IF EXISTS group_members_payout_position_check;

ALTER TABLE public.group_members
  ADD CONSTRAINT group_members_payout_position_check
  CHECK (payout_position IS NULL OR payout_position BETWEEN 1 AND 10);

CREATE OR REPLACE FUNCTION public.finalize_due_groups()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=''
AS $$
DECLARE
  v_group record;
  v_count integer := 0;
  v_members integer;
  v_cycle public.group_cycle;
  v_member record;
  v_period integer;
  v_position integer;
BEGIN
  FOR v_group IN
    SELECT g.*
    FROM public.groups g
    WHERE g.lifecycle_managed = true
      AND g.status::text IN ('open','full')
      AND g.start_date IS NOT NULL
      AND COALESCE(g.close_date, g.start_date - 1) <= CURRENT_DATE
    FOR UPDATE SKIP LOCKED
  LOOP
    SELECT count(*)::integer INTO v_members
    FROM public.group_members gm
    WHERE gm.group_id = v_group.id
      AND gm.status::text IN ('active','pending');

    IF v_members < 5 THEN
      UPDATE public.groups
      SET status='cancelled'::public.group_status,
          close_date=COALESCE(close_date,start_date-1),
          updated_at=now()
      WHERE id=v_group.id;
      CONTINUE;
    END IF;

    IF v_members > 10 THEN
      RAISE EXCEPTION 'GROUP_MEMBER_COUNT_INVALID';
    END IF;

    v_cycle := CASE v_members
      WHEN 5 THEN 'five_month'::public.group_cycle
      WHEN 6 THEN 'six_month'::public.group_cycle
      WHEN 7 THEN 'seven_month'::public.group_cycle
      WHEN 8 THEN 'eight_month'::public.group_cycle
      WHEN 9 THEN 'nine_month'::public.group_cycle
      WHEN 10 THEN 'ten_month'::public.group_cycle
    END;

    UPDATE public.groups
    SET status='closed'::public.group_status,
        cycle=v_cycle,
        slot_count=10,
        finalized_member_count=v_members,
        finalized_at=COALESCE(finalized_at,now()),
        close_date=COALESCE(close_date,start_date-1),
        finish_date=public.calculate_group_finish_date(start_date,v_cycle),
        updated_at=now()
    WHERE id=v_group.id;

    -- Original slot numbers remain the user's selected slots. Once the group
    -- closes, only participating members receive contiguous payout positions.
    v_position := 0;
    FOR v_member IN
      SELECT gm.id AS member_id, gs.position AS original_position
      FROM public.group_members gm
      JOIN public.group_slots gs ON gs.id=gm.slot_id
      WHERE gm.group_id=v_group.id
        AND gm.status::text IN ('active','pending')
      ORDER BY gs.position, gm.joined_at, gm.id
    LOOP
      v_position := v_position + 1;

      UPDATE public.group_members
      SET payout_position=v_position,
          updated_at=now()
      WHERE id=v_member.member_id;

      FOR v_period IN 1..v_members LOOP
        INSERT INTO public.contribution_schedules
          (group_member_id,period_number,due_date,amount,status,outstanding_amount,total_due)
        VALUES
          (v_member.member_id,v_period,
           (v_group.start_date+((v_period-1)*INTERVAL '1 month'))::date,
           v_group.contribution_amount,
           'pending'::public.contribution_status,
           v_group.contribution_amount,
           v_group.contribution_amount)
        ON CONFLICT (group_member_id,period_number) DO NOTHING;
      END LOOP;

      INSERT INTO public.payouts
        (group_id,group_member_id,period_number,scheduled_date,expected_amount,funded_amount,shortfall_amount,status)
      VALUES
        (v_group.id,v_member.member_id,v_position,
         (v_group.start_date+((v_position-1)*INTERVAL '1 month'))::date,
         v_group.contribution_amount*v_members,
         0,
         v_group.contribution_amount*v_members,
         'scheduled'::public.payout_status)
      ON CONFLICT (group_id,period_number) DO NOTHING;
    END LOOP;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
