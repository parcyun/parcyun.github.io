update public.works
set
  title = '공부에서 작품으로, 웹디자인 포트폴리오',
  title_html = '공부에서 작품으로<br>웹디자인 포트폴리오',
  description = '웹디자인을 공부하며 익힌 타이포그래피·레이아웃·인터랙션을 실제 사이트로 완성해 공개하는 공간입니다. 첫 결과물과 제작 이야기를 곧 선보입니다.',
  week = 'First reveal · Coming soon',
  tags = '["Web Design","Portfolio","Coming soon"]'::jsonb
where num = '003';
