INSERT INTO public.app_settings (setting_key, setting_value)
VALUES (
  'tgbot_config',
  jsonb_build_object(
    'dailyLimit', 5,
    'defaultRounds', 1,
    'defaultBatch', 5,
    'defaultDelay', 2
  )
)
ON CONFLICT (setting_key) DO UPDATE
SET setting_value = jsonb_build_object(
  'dailyLimit', 5,
  'defaultRounds', 1,
  'defaultBatch', 5,
  'defaultDelay', 2
) || COALESCE(public.app_settings.setting_value, '{}'::jsonb),
    updated_at = now();

DO $$
DECLARE
  current_settings jsonb;
  current_tabs jsonb;
  mpokket_tab jsonb := jsonb_build_object(
    'id', 'mpokket',
    'label', 'Mpokket',
    'icon', 'Phone',
    'color', 'yellow',
    'placeholder', '',
    'searchType', 'mpokket',
    'apiUrl', '',
    'enabled', true
  );
BEGIN
  SELECT setting_value INTO current_settings
  FROM public.app_settings
  WHERE setting_key = 'main_settings';

  IF current_settings IS NULL THEN
    RETURN;
  END IF;

  current_tabs := COALESCE(current_settings->'tabs', '[]'::jsonb);

  IF NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(current_tabs) AS tab
    WHERE tab->>'searchType' = 'mpokket'
  ) THEN
    UPDATE public.app_settings
    SET setting_value = jsonb_set(
      current_settings,
      '{tabs}',
      current_tabs || jsonb_build_array(mpokket_tab),
      true
    ),
    updated_at = now()
    WHERE setting_key = 'main_settings';
  END IF;
END $$;