ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS close_date date,
  ADD COLUMN IF NOT EXISTS finalized_member_count integer,
  ADD COLUMN IF NOT EXISTS finalized_at timestamptz,
  ADD COLUMN IF NOT EXISTS lifecycle_managed boolean NOT NULL DEFAULT false;

UPDATE public.groups SET close_date=start_date-1 WHERE start_date IS NOT NULL AND close_date IS NULL;
ALTER TABLE public.groups DROP CONSTRAINT IF EXISTS groups_finalized_member_count_check;
ALTER TABLE public.groups ADD CONSTRAINT groups_finalized_member_count_check CHECK (finalized_member_count IS NULL OR finalized_member_count BETWEEN 5 AND 10);
CREATE INDEX IF NOT EXISTS groups_close_date_status_idx ON public.groups(close_date,status);
CREATE UNIQUE INDEX IF NOT EXISTS contribution_schedules_member_period_uidx ON public.contribution_schedules(group_member_id,period_number);
CREATE UNIQUE INDEX IF NOT EXISTS payouts_group_period_uidx ON public.payouts(group_id,period_number);

CREATE OR REPLACE FUNCTION public.calculate_group_finish_date(p_start_date date,p_cycle public.group_cycle)
RETURNS date LANGUAGE sql IMMUTABLE SET search_path='' AS $$
SELECT CASE p_cycle
WHEN 'five_month'::public.group_cycle THEN (p_start_date+INTERVAL '4 months')::date
WHEN 'six_month'::public.group_cycle THEN (p_start_date+INTERVAL '5 months')::date
WHEN 'seven_month'::public.group_cycle THEN (p_start_date+INTERVAL '6 months')::date
WHEN 'eight_month'::public.group_cycle THEN (p_start_date+INTERVAL '7 months')::date
WHEN 'nine_month'::public.group_cycle THEN (p_start_date+INTERVAL '8 months')::date
WHEN 'ten_month'::public.group_cycle THEN (p_start_date+INTERVAL '9 months')::date END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_due_groups()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_group record;v_count integer:=0;v_members integer;v_cycle public.group_cycle;v_member record;v_period integer;
BEGIN
FOR v_group IN SELECT g.* FROM public.groups g WHERE g.lifecycle_managed=true AND g.status::text IN('open','full') AND g.start_date IS NOT NULL AND COALESCE(g.close_date,g.start_date-1)<=CURRENT_DATE FOR UPDATE SKIP LOCKED LOOP
SELECT count(*)::integer INTO v_members FROM public.group_members gm WHERE gm.group_id=v_group.id AND gm.status::text IN('active','pending');
IF v_members<5 THEN UPDATE public.groups SET status='cancelled'::public.group_status,close_date=COALESCE(close_date,start_date-1),updated_at=now() WHERE id=v_group.id;CONTINUE;END IF;
IF v_members>10 THEN RAISE EXCEPTION 'GROUP_MEMBER_COUNT_INVALID';END IF;
v_cycle:=CASE v_members WHEN 5 THEN 'five_month'::public.group_cycle WHEN 6 THEN 'six_month'::public.group_cycle WHEN 7 THEN 'seven_month'::public.group_cycle WHEN 8 THEN 'eight_month'::public.group_cycle WHEN 9 THEN 'nine_month'::public.group_cycle WHEN 10 THEN 'ten_month'::public.group_cycle END;
UPDATE public.groups SET status='closed'::public.group_status,cycle=v_cycle,slot_count=10,finalized_member_count=v_members,finalized_at=COALESCE(finalized_at,now()),close_date=COALESCE(close_date,start_date-1),finish_date=public.calculate_group_finish_date(start_date,v_cycle),updated_at=now() WHERE id=v_group.id;
FOR v_member IN SELECT gm.id AS member_id,gs.position FROM public.group_members gm JOIN public.group_slots gs ON gs.id=gm.slot_id WHERE gm.group_id=v_group.id AND gm.status::text IN('active','pending') ORDER BY gs.position LOOP
FOR v_period IN 1..v_members LOOP
INSERT INTO public.contribution_schedules(group_member_id,period_number,due_date,amount,status,outstanding_amount,total_due) VALUES(v_member.member_id,v_period,(v_group.start_date+((v_period-1)*INTERVAL '1 month'))::date,v_group.contribution_amount,'pending'::public.contribution_status,v_group.contribution_amount,v_group.contribution_amount) ON CONFLICT(group_member_id,period_number) DO NOTHING;
END LOOP;
INSERT INTO public.payouts(group_id,group_member_id,period_number,scheduled_date,expected_amount,funded_amount,shortfall_amount,status) VALUES(v_group.id,v_member.member_id,v_member.position,(v_group.start_date+((v_member.position-1)*INTERVAL '1 month'))::date,v_group.contribution_amount*v_members,0,v_group.contribution_amount*v_members,'scheduled'::public.payout_status) ON CONFLICT(group_id,period_number) DO NOTHING;
END LOOP;v_count:=v_count+1;
END LOOP;RETURN v_count;END;$$;

CREATE OR REPLACE FUNCTION public.activate_due_groups()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_count integer;BEGIN UPDATE public.groups SET status='active'::public.group_status,updated_at=now() WHERE lifecycle_managed=true AND status='closed'::public.group_status AND start_date IS NOT NULL AND start_date<=CURRENT_DATE;GET DIAGNOSTICS v_count=ROW_COUNT;RETURN v_count;END;$$;

CREATE OR REPLACE FUNCTION public.create_group_with_slots(p_name text,p_description text,p_contribution_amount numeric,p_start_date date)
RETURNS public.groups LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=auth.uid();v_role public.admin_role;v_group public.groups%ROWTYPE;v_close date;v_finish date;
BEGIN
IF v_user IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED';END IF;
SELECT ur.role INTO v_role FROM public.user_roles ur WHERE ur.user_id=v_user;IF v_role IS NULL THEN RAISE EXCEPTION 'ADMIN_REQUIRED';END IF;
IF p_name IS NULL OR length(trim(p_name))=0 OR length(p_name)>120 THEN RAISE EXCEPTION 'INVALID_GROUP_NAME';END IF;
IF p_contribution_amount IS NULL OR p_contribution_amount<=0 THEN RAISE EXCEPTION 'INVALID_CONTRIBUTION_AMOUNT';END IF;
IF p_start_date IS NULL OR p_start_date<=CURRENT_DATE THEN RAISE EXCEPTION 'INVALID_START_DATE';END IF;
v_close:=p_start_date-1;v_finish:=(p_start_date+INTERVAL '9 months')::date;
INSERT INTO public.groups(name,description,cycle,contribution_amount,slot_count,start_date,close_date,contribution_due_day,finish_date,status,lifecycle_managed,created_by) VALUES(trim(p_name),NULLIF(trim(p_description),''),'ten_month'::public.group_cycle,p_contribution_amount,10,p_start_date,v_close,29,v_finish,'open'::public.group_status,true,v_user) RETURNING * INTO v_group;
INSERT INTO public.group_slots(group_id,position,status) SELECT v_group.id,s,'available'::public.slot_status FROM generate_series(1,10) s;RETURN v_group;END;$$;

CREATE OR REPLACE FUNCTION public.leave_group(p_group_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=auth.uid();v_group public.groups%ROWTYPE;v_member public.group_members%ROWTYPE;
BEGIN
IF v_user IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED';END IF;PERFORM public.finalize_due_groups();PERFORM public.activate_due_groups();
SELECT * INTO v_group FROM public.groups WHERE id=p_group_id FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'GROUP_NOT_FOUND';END IF;IF v_group.status::text NOT IN('open','full') THEN RAISE EXCEPTION 'GROUP_CLOSED';END IF;
SELECT * INTO v_member FROM public.group_members WHERE group_id=p_group_id AND user_id=v_user AND status::text IN('active','pending') LIMIT 1 FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'NOT_A_MEMBER';END IF;
UPDATE public.group_members SET status='cancelled'::public.membership_status,updated_at=now() WHERE id=v_member.id;UPDATE public.group_slots SET status='available'::public.slot_status,reserved_by=NULL,reserved_until=NULL WHERE id=v_member.slot_id;UPDATE public.groups SET status=CASE WHEN status::text='full' THEN 'open'::public.group_status ELSE status END,updated_at=now() WHERE id=p_group_id;RETURN jsonb_build_object('group_id',p_group_id,'membership_id',v_member.id,'status','cancelled');END;$$;

CREATE OR REPLACE FUNCTION public.delete_group(p_group_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=auth.uid();v_role public.admin_role;v_group public.groups%ROWTYPE;
BEGIN
IF v_user IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED';END IF;SELECT ur.role INTO v_role FROM public.user_roles ur WHERE ur.user_id=v_user;IF v_role IS NULL THEN RAISE EXCEPTION 'ADMIN_REQUIRED';END IF;PERFORM public.finalize_due_groups();PERFORM public.activate_due_groups();SELECT * INTO v_group FROM public.groups WHERE id=p_group_id FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'GROUP_NOT_FOUND';END IF;IF v_group.status::text NOT IN('draft','open','full') OR v_group.lifecycle_managed=false THEN RAISE EXCEPTION 'GROUP_CLOSED';END IF;DELETE FROM public.groups WHERE id=p_group_id;RETURN jsonb_build_object('group_id',p_group_id,'deleted',true);END;$$;

CREATE OR REPLACE FUNCTION public.join_group(p_group_id uuid,p_slot_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user_id uuid:=auth.uid();v_group public.groups%ROWTYPE;v_slot public.group_slots%ROWTYPE;v_membership public.group_members%ROWTYPE;
BEGIN
IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated';END IF;PERFORM public.finalize_due_groups();PERFORM public.activate_due_groups();SELECT * INTO v_group FROM public.groups WHERE id=p_group_id FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'Group not found';END IF;IF v_group.status::text<>'open' OR v_group.lifecycle_managed=false THEN RAISE EXCEPTION 'Group is not available for joining';END IF;
IF EXISTS(SELECT 1 FROM public.group_members WHERE group_id=p_group_id AND user_id=v_user_id AND status::text NOT IN('replaced','cancelled')) THEN RAISE EXCEPTION 'You are already a member of this group';END IF;IF(SELECT count(*) FROM public.group_members WHERE user_id=v_user_id AND status::text='active')>=3 THEN RAISE EXCEPTION 'You can only have 3 active groups';END IF;
SELECT * INTO v_slot FROM public.group_slots WHERE id=p_slot_id AND group_id=p_group_id FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'Selected slot does not exist';END IF;IF v_slot.status::text<>'available' THEN RAISE EXCEPTION 'That position has just been taken. Please choose another position.';END IF;
INSERT INTO public.group_members(group_id,user_id,slot_id,status,joined_at,activated_at) VALUES(p_group_id,v_user_id,v_slot.id,'active'::public.membership_status,now(),now()) RETURNING * INTO v_membership;UPDATE public.group_slots SET status='assigned'::public.slot_status,reserved_by=v_user_id,reserved_until=NULL WHERE id=v_slot.id;IF NOT EXISTS(SELECT 1 FROM public.group_slots WHERE group_id=p_group_id AND status::text='available') THEN UPDATE public.groups SET status='full'::public.group_status WHERE id=p_group_id;END IF;RETURN jsonb_build_object('membership_id',v_membership.id,'group_id',p_group_id,'slot_id',v_slot.id,'position',v_slot.position,'status',v_membership.status::text);END;$$;

CREATE OR REPLACE FUNCTION public.join_group_auto(p_group_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user_id uuid:=auth.uid();v_group public.groups%ROWTYPE;v_slot public.group_slots%ROWTYPE;v_membership public.group_members%ROWTYPE;
BEGIN
IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated';END IF;PERFORM public.finalize_due_groups();PERFORM public.activate_due_groups();SELECT * INTO v_group FROM public.groups WHERE id=p_group_id FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'Group not found';END IF;IF v_group.status::text<>'open' OR v_group.lifecycle_managed=false THEN RAISE EXCEPTION 'Group is not available for joining';END IF;
IF EXISTS(SELECT 1 FROM public.group_members WHERE group_id=p_group_id AND user_id=v_user_id AND status::text NOT IN('replaced','cancelled')) THEN RAISE EXCEPTION 'You are already a member of this group';END IF;IF(SELECT count(*) FROM public.group_members WHERE user_id=v_user_id AND status::text='active')>=3 THEN RAISE EXCEPTION 'You can only have 3 active groups';END IF;
SELECT * INTO v_slot FROM public.group_slots WHERE group_id=p_group_id AND status::text='available' ORDER BY position LIMIT 1 FOR UPDATE SKIP LOCKED;IF NOT FOUND THEN RAISE EXCEPTION 'No available slots in this group';END IF;INSERT INTO public.group_members(group_id,user_id,slot_id,status,joined_at,activated_at) VALUES(p_group_id,v_user_id,v_slot.id,'active'::public.membership_status,now(),now()) RETURNING * INTO v_membership;UPDATE public.group_slots SET status='assigned'::public.slot_status,reserved_by=v_user_id,reserved_until=NULL WHERE id=v_slot.id;IF NOT EXISTS(SELECT 1 FROM public.group_slots WHERE group_id=p_group_id AND status::text='available') THEN UPDATE public.groups SET status='full'::public.group_status WHERE id=p_group_id;END IF;RETURN jsonb_build_object('membership_id',v_membership.id,'group_id',p_group_id,'slot_id',v_slot.id,'position',v_slot.position,'status',v_membership.status::text);END;$$;

REVOKE ALL ON FUNCTION public.finalize_due_groups() FROM PUBLIC,anon;GRANT EXECUTE ON FUNCTION public.finalize_due_groups() TO authenticated;
REVOKE ALL ON FUNCTION public.activate_due_groups() FROM PUBLIC,anon;GRANT EXECUTE ON FUNCTION public.activate_due_groups() TO authenticated;
REVOKE ALL ON FUNCTION public.create_group_with_slots(text,text,numeric,date) FROM PUBLIC,anon;GRANT EXECUTE ON FUNCTION public.create_group_with_slots(text,text,numeric,date) TO authenticated;
REVOKE ALL ON FUNCTION public.leave_group(uuid) FROM PUBLIC,anon;GRANT EXECUTE ON FUNCTION public.leave_group(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.delete_group(uuid) FROM PUBLIC,anon;GRANT EXECUTE ON FUNCTION public.delete_group(uuid) TO authenticated;
