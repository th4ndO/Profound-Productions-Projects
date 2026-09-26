-- Six new goal visuals (garden, moon, lanterns, stones, canvas, balloon)
-- so every idea category has a fitting picture. Widens the theme check;
-- existing rows all use the original six, which stay valid.
alter table goals drop constraint goals_theme_check;
alter table goals add constraint goals_theme_check check (
  theme in (
    'tree', 'strength', 'building', 'mountain', 'jar', 'shelf',
    'garden', 'moon', 'lanterns', 'stones', 'canvas', 'balloon'
  )
);
