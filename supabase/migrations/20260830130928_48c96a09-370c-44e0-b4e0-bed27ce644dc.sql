CREATE OR REPLACE FUNCTION public.fix_mojibake(t text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  src text := U&'\20AC\201A\0192\201E\2026\2020\2021\02C6\2030\0160\2039\0152\017D\2018\2019\201C\201D\2022\2013\2014\02DC\2122\0161\203A\0153\017E\0178';
  dst text := chr(128)||chr(130)||chr(131)||chr(132)||chr(133)||chr(134)||chr(135)||chr(136)||chr(137)||chr(138)||chr(139)||chr(140)||chr(142)||chr(145)||chr(146)||chr(147)||chr(148)||chr(149)||chr(150)||chr(151)||chr(152)||chr(153)||chr(154)||chr(155)||chr(156)||chr(158)||chr(159);
BEGIN
  IF t IS NULL OR t !~ '(Ã|Å|Â|Ä|Ð|Ñ)[\u0080-\u009F\u00A0-\u00BF]' THEN
    RETURN t;
  END IF;
  BEGIN
    RETURN convert_from(convert_to(translate(t, src, dst), 'LATIN1'), 'UTF8');
  EXCEPTION WHEN OTHERS THEN
    RETURN t;
  END;
END;
$$;