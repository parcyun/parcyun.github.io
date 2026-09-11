-- Keep the live resource row aligned with the current public Notion address.
update public.resources
set url = 'https://parcyun.notion.site/3133f99a82238159a0b3e9eba02d462c?source=copy_link'
where id = 'yearly-life-archive';
