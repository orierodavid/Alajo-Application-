-- Deotech Finance default/recovery lifecycle.
-- Policy: 30-day recovery window; pre-payout defaults may be removed and cycle reduced;
-- post-payout defaults never shorten the group and may be temporarily covered by Deotech.

ALTER TYPE public.contribution_status ADD VALUE IF NOT EXISTS 'cancelled';

ALTER TABLE public.default_cases
  ADD COLUMN IF NOT EXISTS payout_received boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS grace_until timestamptz,
  ADD COLUMN IF NOT EXISTS defaulted_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_notice_at timestamptz,
  ADD COLUMN IF NOT EXISTS notice_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deotech_covered_amount bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recovered_amount bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_bureau_notice_at timestamptz;

ALTER TABLE public.recovery_transactions DROP CONSTRAINT IF EXISTS recovery_transactions_source_check;
ALTER TABLE public.recovery_transactions ADD CONSTRAINT recovery_transactions_source_check CHECK (source = ANY (ARRAY['defaulting_member'::text,'replacement'::text,'other_recovery'::text,'deotech_cover'::text,'member_repayment'::text]));

CREATE INDEX IF NOT EXISTS idx_default_cases_member_status ON public.default_cases(group_member_id,status);
CREATE INDEX IF NOT EXISTS idx_default_cases_grace_status ON public.default_cases(grace_until,status);
CREATE INDEX IF NOT EXISTS idx_recovery_transactions_case_source ON public.recovery_transactions(default_case_id,source);
CREATE INDEX IF NOT EXISTS idx_contribution_schedules_due_status ON public.contribution_schedules(due_date,status);

INSERT INTO public.system_settings(key,integer_value,updated_at) VALUES ('default_grace_days',30,now()) ON CONFLICT (key) DO UPDATE SET integer_value=30,updated_at=now();
INSERT INTO public.system_settings(key,integer_value,updated_at) VALUES ('credit_bureau_notice_days',28,now()) ON CONFLICT (key) DO UPDATE SET integer_value=28,updated_at=now();

CREATE OR REPLACE FUNCTION public.rebuild_group_after_pre_payout_default(p_group_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $function$
DECLARE g public.groups%rowtype; m record; new_count integer; new_cycle public.group_cycle; paid_period integer; pos integer:=0;
BEGIN
  SELECT * INTO g FROM public.groups WHERE id=p_group_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'GROUP_NOT_FOUND'; END IF;
  SELECT count(*)::integer INTO new_count FROM public.group_members WHERE group_id=p_group_id AND status::text IN ('active','pending');
  IF new_count<5 THEN UPDATE public.groups SET status='cancelled'::public.group_status,finalized_member_count=new_count,updated_at=now() WHERE id=p_group_id; RETURN jsonb_build_object('group_id',p_group_id,'members',new_count,'status','cancelled'); END IF;
  new_cycle:=CASE new_count WHEN 5 THEN 'five_month'::public.group_cycle WHEN 6 THEN 'six_month'::public.group_cycle WHEN 7 THEN 'seven_month'::public.group_cycle WHEN 8 THEN 'eight_month'::public.group_cycle WHEN 9 THEN 'nine_month'::public.group_cycle ELSE 'ten_month'::public.group_cycle END;
  SELECT COALESCE(max(period_number),0) INTO paid_period FROM public.payouts WHERE group_id=p_group_id AND status::text='paid';
  DELETE FROM public.payouts WHERE group_id=p_group_id AND status::text<>'paid';
  UPDATE public.group_members SET payout_position=NULL,updated_at=now() WHERE group_id=p_group_id AND status::text IN ('active','pending');
  FOR m IN SELECT gm.id member_id FROM public.group_members gm JOIN public.group_slots gs ON gs.id=gm.slot_id WHERE gm.group_id=p_group_id AND gm.status::text IN ('active','pending') ORDER BY gs.position,gm.joined_at,gm.id LOOP
    pos:=pos+1; UPDATE public.group_members SET payout_position=pos,updated_at=now() WHERE id=m.member_id;
    IF pos>paid_period THEN INSERT INTO public.payouts(group_id,group_member_id,period_number,scheduled_date,expected_amount,funded_amount,shortfall_amount,status) VALUES(p_group_id,m.member_id,pos,(g.start_date+((pos-1)*INTERVAL '1 month'))::date,g.contribution_amount*new_count,0,g.contribution_amount*new_count,'scheduled'::public.payout_status); END IF;
  END LOOP;
  UPDATE public.contribution_schedules cs SET status='cancelled'::public.contribution_status,outstanding_amount=0,total_due=0,updated_at=now() FROM public.group_members gm WHERE gm.id=cs.group_member_id AND gm.group_id=p_group_id AND gm.status::text IN ('active','pending') AND cs.period_number>new_count AND cs.status::text IN ('pending','overdue');
  UPDATE public.groups SET cycle=new_cycle,finalized_member_count=new_count,finish_date=public.calculate_group_finish_date(start_date,new_cycle),updated_at=now() WHERE id=p_group_id;
  RETURN jsonb_build_object('group_id',p_group_id,'members',new_count,'cycle_months',new_count,'paid_period',paid_period,'status','active');
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_default_recovery()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $function$
DECLARE r record; c record; v_group_id uuid; grace_days integer:=COALESCE(public.get_setting_integer('default_grace_days',30),30); created_cases integer:=0; removed_members integer:=0; recovery_cases integer:=0; notifications_sent integer:=0; groups_rebuilt integer:=0; rebuilt_groups uuid[]:=ARRAY[]::uuid[]; v_payout_received boolean;
BEGIN
  IF public.get_my_admin_role() IS NULL THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  UPDATE public.contribution_schedules SET grace_until=COALESCE(grace_until,(due_date+grace_days)::timestamptz),status=CASE WHEN due_date<CURRENT_DATE AND status::text='pending' THEN 'overdue'::public.contribution_status ELSE status END,updated_at=now() WHERE status::text IN ('pending','overdue') AND outstanding_amount>0 AND due_date<=CURRENT_DATE;
  FOR r IN SELECT cs.id contribution_id,cs.group_member_id,gm.group_id,gm.user_id,cs.outstanding_amount,cs.grace_until,(gm.payout_received_at IS NOT NULL) payout_received FROM public.contribution_schedules cs JOIN public.group_members gm ON gm.id=cs.group_member_id WHERE cs.status::text='overdue' AND cs.outstanding_amount>0 AND cs.grace_until<=now() AND gm.status::text IN ('active','pending','defaulted') AND NOT EXISTS(SELECT 1 FROM public.default_cases dc WHERE dc.contribution_id=cs.id AND dc.status NOT IN ('resolved','cancelled')) LOOP
    INSERT INTO public.default_cases(group_id,group_member_id,contribution_id,status,outstanding_amount,payout_received,grace_until,defaulted_at,last_notice_at,notice_count) VALUES(r.group_id,r.group_member_id,r.contribution_id,CASE WHEN r.payout_received THEN 'recovery' ELSE 'open' END,r.outstanding_amount::bigint,r.payout_received,r.grace_until,now(),now(),1);
    created_cases:=created_cases+1; IF r.payout_received THEN recovery_cases:=recovery_cases+1; END IF;
    INSERT INTO public.notifications(user_id,type,title,body,metadata) VALUES(r.user_id,'contribution_default',CASE WHEN r.payout_received THEN 'Contribution default — recovery opened' ELSE 'Contribution default — membership review' END,CASE WHEN r.payout_received THEN 'Your contribution remained unpaid after the 30-day recovery window. Your group will continue while the outstanding amount is placed into recovery.' ELSE 'Your contribution remained unpaid after the 30-day recovery window. Because you have not received your payout, your membership will be removed and the group cycle recalculated.' END,jsonb_build_object('group_id',r.group_id,'contribution_id',r.contribution_id,'grace_until',r.grace_until,'payout_received',r.payout_received)); notifications_sent:=notifications_sent+1;
  END LOOP;
  FOR c IN SELECT dc.*,gm.user_id FROM public.default_cases dc JOIN public.group_members gm ON gm.id=dc.group_member_id WHERE dc.status IN ('open','recovery') LOOP
    SELECT (payout_received_at IS NOT NULL) INTO v_payout_received FROM public.group_members WHERE id=c.group_member_id FOR UPDATE;
    IF v_payout_received THEN UPDATE public.default_cases SET payout_received=true,status='recovery',updated_at=now() WHERE id=c.id; recovery_cases:=recovery_cases+1;
    ELSE
      UPDATE public.group_members SET status='defaulted'::public.membership_status,updated_at=now() WHERE id=c.group_member_id AND status::text IN ('active','pending');
      UPDATE public.group_slots SET status='available'::public.slot_status,reserved_by=NULL,reserved_until=NULL WHERE id=(SELECT slot_id FROM public.group_members WHERE id=c.group_member_id);
      UPDATE public.contribution_schedules SET status='cancelled'::public.contribution_status,outstanding_amount=0,total_due=0,updated_at=now() WHERE group_member_id=c.group_member_id AND status::text IN ('pending','overdue');
      UPDATE public.default_cases SET status='recovery',payout_received=false,defaulted_at=COALESCE(defaulted_at,now()),updated_at=now() WHERE id=c.id;
      removed_members:=removed_members+1; IF NOT(c.group_id=ANY(rebuilt_groups)) THEN rebuilt_groups:=array_append(rebuilt_groups,c.group_id); END IF;
    END IF;
  END LOOP;
  FOREACH v_group_id IN ARRAY rebuilt_groups LOOP PERFORM public.rebuild_group_after_pre_payout_default(v_group_id); groups_rebuilt:=groups_rebuilt+1; END LOOP;
  RETURN jsonb_build_object('grace_days',grace_days,'created_cases',created_cases,'removed_members',removed_members,'recovery_cases',recovery_cases,'groups_rebuilt',groups_rebuilt,'notifications',notifications_sent);
END;
$function$;

CREATE OR REPLACE FUNCTION public.protect_due_payouts()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $function$
DECLARE payout_row record; s record; cover numeric; covered numeric; paid_total numeric; funded numeric; protected integer:=0;
BEGIN
  IF public.get_my_admin_role() IS NULL THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  FOR payout_row IN SELECT po.* FROM public.payouts po WHERE po.status::text='scheduled' AND po.scheduled_date<=CURRENT_DATE ORDER BY po.scheduled_date,po.id FOR UPDATE SKIP LOCKED LOOP
    SELECT COALESCE(sum(cs.amount) FILTER(WHERE cs.status::text='paid'),0) INTO paid_total FROM public.contribution_schedules cs JOIN public.group_members gm ON gm.id=cs.group_member_id WHERE gm.group_id=payout_row.group_id AND cs.period_number=payout_row.period_number;
    FOR s IN SELECT cs.id schedule_id,cs.amount,dc.id default_case_id FROM public.contribution_schedules cs JOIN public.group_members gm ON gm.id=cs.group_member_id JOIN public.default_cases dc ON dc.group_member_id=gm.id AND dc.group_id=gm.group_id AND dc.status='recovery' AND dc.payout_received=true WHERE gm.group_id=payout_row.group_id AND cs.period_number=payout_row.period_number AND cs.status::text IN ('pending','overdue') AND gm.payout_received_at IS NOT NULL LOOP
      SELECT COALESCE(sum(rt.amount),0) INTO covered FROM public.recovery_transactions rt WHERE rt.default_case_id=s.default_case_id AND rt.source='deotech_cover' AND rt.provider_reference LIKE 'DEOTECH-COVER-'||payout_row.id::text||'-%'; cover:=greatest(s.amount-covered,0);
      IF cover>0 THEN
        INSERT INTO public.recovery_transactions(default_case_id,amount,source,provider_reference) VALUES(s.default_case_id,cover::bigint,'deotech_cover','DEOTECH-COVER-'||payout_row.id::text||'-'||s.schedule_id::text);
        INSERT INTO public.ledger_transactions(user_id,group_id,type,status,amount,currency,payout_id,description,metadata) VALUES(NULL,payout_row.group_id,'reserve_cover','posted',cover,'NGN',payout_row.id,'Deotech temporary payout protection for post-payout default',jsonb_build_object('default_case_id',s.default_case_id,'schedule_id',s.schedule_id,'payout_id',payout_row.id));
        UPDATE public.default_cases SET deotech_covered_amount=deotech_covered_amount+cover::bigint,updated_at=now() WHERE id=s.default_case_id; paid_total:=paid_total+cover; protected:=protected+1;
      END IF;
    END LOOP;
    funded:=least(payout_row.expected_amount,paid_total); UPDATE public.payouts SET funded_amount=funded,shortfall_amount=greatest(expected_amount-funded,0),status=CASE WHEN funded>=expected_amount THEN 'processing'::public.payout_status ELSE 'held'::public.payout_status END,updated_at=now() WHERE id=payout_row.id;
  END LOOP; RETURN jsonb_build_object('protected',protected);
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_default_repayment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $function$
DECLARE dc record; repayment bigint;
BEGIN
  IF NEW.status::text='paid' AND COALESCE(OLD.status::text,'')<>'paid' THEN
    FOR dc IN SELECT * FROM public.default_cases WHERE contribution_id=NEW.id AND status IN ('open','recovery') FOR UPDATE LOOP
      repayment:=GREATEST(COALESCE(NEW.total_due,NEW.amount),0)::bigint;
      IF repayment>0 THEN
        INSERT INTO public.recovery_transactions(default_case_id,amount,source,provider_reference) VALUES(dc.id,repayment,'member_repayment','SCHEDULE-'||NEW.id::text||'-'||to_char(now(),'YYYYMMDDHH24MISSMS'));
        UPDATE public.default_cases SET recovered_amount=recovered_amount+repayment,outstanding_amount=GREATEST(outstanding_amount-repayment,0),status=CASE WHEN GREATEST(outstanding_amount-repayment,0)<=0 THEN 'resolved' ELSE 'recovery' END,resolved_at=CASE WHEN GREATEST(outstanding_amount-repayment,0)<=0 THEN COALESCE(resolved_at,now()) ELSE resolved_at END,updated_at=now() WHERE id=dc.id;
        INSERT INTO public.notifications(user_id,type,title,body,metadata) SELECT gm.user_id,'recovery_payment','Recovery payment received','Your payment has been applied to your outstanding recovery case.',jsonb_build_object('default_case_id',dc.id,'contribution_id',NEW.id,'amount',repayment) FROM public.group_members gm WHERE gm.id=dc.group_member_id;
      END IF;
    END LOOP;
  END IF; RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS contribution_default_repayment_trigger ON public.contribution_schedules;
CREATE TRIGGER contribution_default_repayment_trigger AFTER UPDATE OF status ON public.contribution_schedules FOR EACH ROW EXECUTE FUNCTION public.record_default_repayment();

REVOKE EXECUTE ON FUNCTION public.rebuild_group_after_pre_payout_default(uuid) FROM authenticated,anon,public;
REVOKE EXECUTE ON FUNCTION public.process_default_recovery() FROM anon,public;
REVOKE EXECUTE ON FUNCTION public.protect_due_payouts() FROM anon,public;
GRANT EXECUTE ON FUNCTION public.process_default_recovery() TO authenticated;
GRANT EXECUTE ON FUNCTION public.protect_due_payouts() TO authenticated;
