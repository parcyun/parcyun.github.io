// 지구본 lab 국가 메타데이터 — world.json의 영어명(properties.n)을 키로.
// 필드: iso2(국기 이모지용), ko(공식 한국어 국명), en(공식 영어 국명), langs(주요 언어 최대3), gov(정치체제), econ(경제체제), desc(한 줄 설명)
// 주요 국가 위주로 큐레이션. 표에 없는 국가는 GlobeLab에서 영어명+대륙만으로 폴백 렌더.
// ISO2 → 유니코드 지역표시문자(Regional Indicator)로 국기 이모지 생성.
export function flagEmoji(iso2){ if(!iso2||iso2.length!==2)return ''; const A=0x1F1E6; return String.fromCodePoint(A+(iso2.charCodeAt(0)-65))+String.fromCodePoint(A+(iso2.charCodeAt(1)-65)); }

export const COUNTRY = {
  // ===== 동아시아 · 아시아 =====
  'South Korea':{iso2:'KR',ko:'대한민국',en:'Republic of Korea',langs:['한국어'],gov:'자유민주주의',econ:'자본주의',desc:'동아시아의 반도 국가로 빠른 경제성장과 K-문화로 유명해요.'},
  'North Korea':{iso2:'KP',ko:'조선민주주의인민공화국',en:"Democratic People's Republic of Korea",langs:['한국어'],gov:'일당 사회주의',econ:'계획경제',desc:'한반도 북부의 사회주의 국가로 폐쇄적 체제를 유지해요.'},
  'Japan':{iso2:'JP',ko:'일본국',en:'Japan',langs:['일본어'],gov:'입헌군주제·의원내각제',econ:'자본주의',desc:'네 개의 큰 섬으로 이뤄진 동아시아의 경제 강국이에요.'},
  'China':{iso2:'CN',ko:'중화인민공화국',en:"People's Republic of China",langs:['중국어'],gov:'일당 사회주의',econ:'사회주의 시장경제',desc:'세계에서 인구가 가장 많은 대국 중 하나이자 아시아의 중심이에요.'},
  'Taiwan':{iso2:'TW',ko:'대만',en:'Taiwan',langs:['중국어'],gov:'자유민주주의',econ:'자본주의',desc:'동아시아의 섬으로 반도체 산업이 크게 발달했어요.'},
  'Mongolia':{iso2:'MN',ko:'몽골',en:'Mongolia',langs:['몽골어'],gov:'의원내각제 공화국',econ:'자본주의',desc:'광활한 초원과 유목 문화로 알려진 내륙국이에요.'},
  'Vietnam':{iso2:'VN',ko:'베트남 사회주의공화국',en:'Socialist Republic of Vietnam',langs:['베트남어'],gov:'일당 사회주의',econ:'사회주의 시장경제',desc:'동남아시아의 긴 해안선을 가진 나라예요.'},
  'Thailand':{iso2:'TH',ko:'타이 왕국',en:'Kingdom of Thailand',langs:['타이어'],gov:'입헌군주제',econ:'자본주의',desc:'불교문화와 관광으로 유명한 동남아 국가예요.'},
  'Philippines':{iso2:'PH',ko:'필리핀 공화국',en:'Republic of the Philippines',langs:['필리핀어','영어'],gov:'대통령제 공화국',econ:'자본주의',desc:'7천여 개의 섬으로 이뤄진 동남아 군도 국가예요.'},
  'Indonesia':{iso2:'ID',ko:'인도네시아 공화국',en:'Republic of Indonesia',langs:['인도네시아어'],gov:'대통령제 공화국',econ:'자본주의',desc:'세계 최대의 섬나라로 수많은 화산과 문화가 있어요.'},
  'Malaysia':{iso2:'MY',ko:'말레이시아',en:'Malaysia',langs:['말레이어','영어'],gov:'입헌군주제',econ:'자본주의',desc:'말레이반도와 보르네오섬에 걸친 다민족 국가예요.'},
  'Singapore':{iso2:'SG',ko:'싱가포르 공화국',en:'Republic of Singapore',langs:['영어','중국어','말레이어'],gov:'의원내각제 공화국',econ:'자본주의',desc:'작지만 금융·무역이 발달한 도시국가예요.'},
  'India':{iso2:'IN',ko:'인도 공화국',en:'Republic of India',langs:['힌디어','영어'],gov:'의원내각제 연방공화국',econ:'자본주의',desc:'남아시아의 거대한 인구와 다양한 문화를 지닌 나라예요.'},
  'Pakistan':{iso2:'PK',ko:'파키스탄 이슬람공화국',en:'Islamic Republic of Pakistan',langs:['우르두어','영어'],gov:'의원내각제 연방공화국',econ:'자본주의',desc:'남아시아의 인더스 문명 발상지예요.'},
  'Bangladesh':{iso2:'BD',ko:'방글라데시 인민공화국',en:"People's Republic of Bangladesh",langs:['벵골어'],gov:'의원내각제 공화국',econ:'자본주의',desc:'갠지스 삼각주에 자리한 인구 밀집 국가예요.'},
  'Saudi Arabia':{iso2:'SA',ko:'사우디아라비아 왕국',en:'Kingdom of Saudi Arabia',langs:['아랍어'],gov:'전제군주제',econ:'자본주의(석유)',desc:'이슬람 성지와 막대한 석유 자원을 가진 나라예요.'},
  'United Arab Emirates':{iso2:'AE',ko:'아랍에미리트',en:'United Arab Emirates',langs:['아랍어'],gov:'연방 군주제',econ:'자본주의',desc:'두바이·아부다비로 유명한 걸프 연안 연방국이에요.'},
  'Iran':{iso2:'IR',ko:'이란 이슬람공화국',en:'Islamic Republic of Iran',langs:['페르시아어'],gov:'이슬람 공화제',econ:'혼합경제',desc:'페르시아 문명을 계승한 서아시아의 대국이에요.'},
  'Iraq':{iso2:'IQ',ko:'이라크 공화국',en:'Republic of Iraq',langs:['아랍어','쿠르드어'],gov:'의원내각제 연방공화국',econ:'자본주의(석유)',desc:'메소포타미아 문명의 발상지예요.'},
  'Israel':{iso2:'IL',ko:'이스라엘국',en:'State of Israel',langs:['히브리어','아랍어'],gov:'의원내각제 공화국',econ:'자본주의',desc:'지중해 동안의 첨단기술 국가예요.'},
  'Turkey':{iso2:'TR',ko:'튀르키예 공화국',en:'Republic of Türkiye',langs:['튀르키예어'],gov:'대통령제 공화국',econ:'자본주의',desc:'아시아와 유럽에 걸친 문명의 교차로예요.'},
  'Kazakhstan':{iso2:'KZ',ko:'카자흐스탄 공화국',en:'Republic of Kazakhstan',langs:['카자흐어','러시아어'],gov:'대통령제 공화국',econ:'자본주의',desc:'세계에서 가장 큰 내륙국이에요.'},
  'Afghanistan':{iso2:'AF',ko:'아프가니스탄',en:'Afghanistan',langs:['다리어','파슈토어'],gov:'이슬람 신정',econ:'혼합경제',desc:'중앙아시아 산악 지대의 내륙국이에요.'},
  'Nepal':{iso2:'NP',ko:'네팔',en:'Nepal',langs:['네팔어'],gov:'의원내각제 연방공화국',econ:'자본주의',desc:'히말라야와 에베레스트로 유명한 나라예요.'},
  'Sri Lanka':{iso2:'LK',ko:'스리랑카 민주사회주의공화국',en:'Democratic Socialist Republic of Sri Lanka',langs:['싱할라어','타밀어'],gov:'대통령제 공화국',econ:'자본주의',desc:'인도양의 섬나라로 홍차가 유명해요.'},
  'Myanmar':{iso2:'MM',ko:'미얀마 연방공화국',en:'Republic of the Union of Myanmar',langs:['버마어'],gov:'군정',econ:'혼합경제',desc:'동남아시아의 불교문화 국가예요.'},
  'Cambodia':{iso2:'KH',ko:'캄보디아 왕국',en:'Kingdom of Cambodia',langs:['크메르어'],gov:'입헌군주제',econ:'자본주의',desc:'앙코르와트 유적으로 유명한 나라예요.'},

  // ===== 유럽 =====
  'United Kingdom':{iso2:'GB',ko:'그레이트브리튼 및 북아일랜드 연합왕국',en:'United Kingdom',langs:['영어'],gov:'입헌군주제·의원내각제',econ:'자본주의',desc:'산업혁명의 발상지이자 유럽의 섬나라예요.'},
  'France':{iso2:'FR',ko:'프랑스 공화국',en:'French Republic',langs:['프랑스어'],gov:'이원집정부제 공화국',econ:'자본주의',desc:'예술·패션·요리로 유명한 서유럽의 중심국이에요.'},
  'Germany':{iso2:'DE',ko:'독일 연방공화국',en:'Federal Republic of Germany',langs:['독일어'],gov:'의원내각제 연방공화국',econ:'사회적 시장경제',desc:'유럽 최대 경제 규모의 제조 강국이에요.'},
  'Italy':{iso2:'IT',ko:'이탈리아 공화국',en:'Italian Republic',langs:['이탈리아어'],gov:'의원내각제 공화국',econ:'자본주의',desc:'로마 제국과 르네상스의 나라예요.'},
  'Spain':{iso2:'ES',ko:'스페인 왕국',en:'Kingdom of Spain',langs:['스페인어'],gov:'입헌군주제',econ:'자본주의',desc:'이베리아반도의 정열적인 문화를 지닌 나라예요.'},
  'Portugal':{iso2:'PT',ko:'포르투갈 공화국',en:'Portuguese Republic',langs:['포르투갈어'],gov:'의원내각제 공화국',econ:'자본주의',desc:'대항해시대를 연 이베리아반도의 나라예요.'},
  'Netherlands':{iso2:'NL',ko:'네덜란드 왕국',en:'Kingdom of the Netherlands',langs:['네덜란드어'],gov:'입헌군주제',econ:'자본주의',desc:'풍차와 운하, 낮은 땅으로 유명해요.'},
  'Belgium':{iso2:'BE',ko:'벨기에 왕국',en:'Kingdom of Belgium',langs:['네덜란드어','프랑스어','독일어'],gov:'입헌군주제 연방국',econ:'자본주의',desc:'EU 본부가 있는 서유럽의 나라예요.'},
  'Switzerland':{iso2:'CH',ko:'스위스 연방',en:'Swiss Confederation',langs:['독일어','프랑스어','이탈리아어'],gov:'연방 공화국(직접민주주의)',econ:'자본주의',desc:'알프스와 금융·시계로 유명한 중립국이에요.'},
  'Austria':{iso2:'AT',ko:'오스트리아 공화국',en:'Republic of Austria',langs:['독일어'],gov:'의원내각제 연방공화국',econ:'자본주의',desc:'음악과 알프스로 유명한 중부유럽 국가예요.'},
  'Sweden':{iso2:'SE',ko:'스웨덴 왕국',en:'Kingdom of Sweden',langs:['스웨덴어'],gov:'입헌군주제',econ:'자본주의(복지국가)',desc:'북유럽의 복지·디자인 강국이에요.'},
  'Norway':{iso2:'NO',ko:'노르웨이 왕국',en:'Kingdom of Norway',langs:['노르웨이어'],gov:'입헌군주제',econ:'자본주의(복지국가)',desc:'피오르와 석유로 부유한 북유럽 국가예요.'},
  'Denmark':{iso2:'DK',ko:'덴마크 왕국',en:'Kingdom of Denmark',langs:['덴마크어'],gov:'입헌군주제',econ:'자본주의(복지국가)',desc:'북유럽의 작지만 살기 좋은 나라예요.'},
  'Finland':{iso2:'FI',ko:'핀란드 공화국',en:'Republic of Finland',langs:['핀란드어','스웨덴어'],gov:'의원내각제 공화국',econ:'자본주의(복지국가)',desc:'호수와 숲, 오로라로 유명한 북유럽 국가예요.'},
  'Poland':{iso2:'PL',ko:'폴란드 공화국',en:'Republic of Poland',langs:['폴란드어'],gov:'의원내각제 공화국',econ:'자본주의',desc:'중부유럽의 역사 깊은 나라예요.'},
  'Ukraine':{iso2:'UA',ko:'우크라이나',en:'Ukraine',langs:['우크라이나어'],gov:'이원집정부제 공화국',econ:'자본주의',desc:'비옥한 흑토와 밀 생산으로 알려진 동유럽 국가예요.'},
  'Russia':{iso2:'RU',ko:'러시아 연방',en:'Russian Federation',langs:['러시아어'],gov:'연방 대통령제',econ:'혼합경제',desc:'세계에서 가장 영토가 넓은 나라예요.'},
  'Greece':{iso2:'GR',ko:'그리스 공화국',en:'Hellenic Republic',langs:['그리스어'],gov:'의원내각제 공화국',econ:'자본주의',desc:'서양 문명과 민주주의의 발상지예요.'},
  'Ireland':{iso2:'IE',ko:'아일랜드',en:'Ireland',langs:['아일랜드어','영어'],gov:'의원내각제 공화국',econ:'자본주의',desc:'초록 들판과 켈트 문화의 섬나라예요.'},
  'Czechia':{iso2:'CZ',ko:'체코 공화국',en:'Czech Republic',langs:['체코어'],gov:'의원내각제 공화국',econ:'자본주의',desc:'프라하로 유명한 중부유럽 국가예요.'},

  // ===== 아프리카 =====
  'Egypt':{iso2:'EG',ko:'이집트 아랍공화국',en:'Arab Republic of Egypt',langs:['아랍어'],gov:'대통령제 공화국',econ:'혼합경제',desc:'나일강과 피라미드의 고대 문명 국가예요.'},
  'Nigeria':{iso2:'NG',ko:'나이지리아 연방공화국',en:'Federal Republic of Nigeria',langs:['영어'],gov:'대통령제 연방공화국',econ:'자본주의',desc:'아프리카에서 인구가 가장 많은 나라예요.'},
  'South Africa':{iso2:'ZA',ko:'남아프리카 공화국',en:'Republic of South Africa',langs:['줄루어','코사어','아프리칸스어'],gov:'의원내각제 공화국',econ:'자본주의',desc:'아프리카 최남단의 다문화 국가예요.'},
  'Ethiopia':{iso2:'ET',ko:'에티오피아 연방민주공화국',en:'Federal Democratic Republic of Ethiopia',langs:['암하라어'],gov:'의원내각제 연방공화국',econ:'혼합경제',desc:'커피의 원산지이자 오랜 독립 역사를 지닌 나라예요.'},
  'Kenya':{iso2:'KE',ko:'케냐 공화국',en:'Republic of Kenya',langs:['스와힐리어','영어'],gov:'대통령제 공화국',econ:'자본주의',desc:'사바나 야생동물과 마라톤으로 유명해요.'},
  'Morocco':{iso2:'MA',ko:'모로코 왕국',en:'Kingdom of Morocco',langs:['아랍어','베르베르어'],gov:'입헌군주제',econ:'자본주의',desc:'사막과 지중해가 만나는 북아프리카 국가예요.'},
  'Algeria':{iso2:'DZ',ko:'알제리 인민민주공화국',en:"People's Democratic Republic of Algeria",langs:['아랍어','베르베르어'],gov:'대통령제 공화국',econ:'혼합경제',desc:'아프리카에서 가장 영토가 넓은 나라예요.'},
  'Ghana':{iso2:'GH',ko:'가나 공화국',en:'Republic of Ghana',langs:['영어'],gov:'대통령제 공화국',econ:'자본주의',desc:'서아프리카의 금과 카카오 생산국이에요.'},
  'Tanzania':{iso2:'TZ',ko:'탄자니아 연합공화국',en:'United Republic of Tanzania',langs:['스와힐리어','영어'],gov:'대통령제 공화국',econ:'혼합경제',desc:'킬리만자로와 세렝게티로 유명해요.'},
  'United Republic of Tanzania':{iso2:'TZ',ko:'탄자니아 연합공화국',en:'United Republic of Tanzania',langs:['스와힐리어','영어'],gov:'대통령제 공화국',econ:'혼합경제',desc:'킬리만자로와 세렝게티로 유명해요.'},

  // ===== 북아메리카 =====
  'United States of America':{iso2:'US',ko:'아메리카 합중국',en:'United States of America',langs:['영어'],gov:'대통령제 연방공화국',econ:'자본주의',desc:'50개 주로 이뤄진 세계적 경제·군사 강국이에요.'},
  'Canada':{iso2:'CA',ko:'캐나다',en:'Canada',langs:['영어','프랑스어'],gov:'입헌군주제·의원내각제 연방국',econ:'자본주의',desc:'광활한 자연을 가진 북미의 큰 나라예요.'},
  'Mexico':{iso2:'MX',ko:'멕시코 합중국',en:'United Mexican States',langs:['스페인어'],gov:'대통령제 연방공화국',econ:'자본주의',desc:'마야·아즈텍 문명을 계승한 북미 국가예요.'},
  'Cuba':{iso2:'CU',ko:'쿠바 공화국',en:'Republic of Cuba',langs:['스페인어'],gov:'일당 사회주의',econ:'계획경제',desc:'카리브해의 사회주의 섬나라예요.'},
  'Guatemala':{iso2:'GT',ko:'과테말라 공화국',en:'Republic of Guatemala',langs:['스페인어'],gov:'대통령제 공화국',econ:'자본주의',desc:'마야 문명 유적이 많은 중미 국가예요.'},
  'Greenland':{iso2:'GL',ko:'그린란드',en:'Greenland',langs:['그린란드어','덴마크어'],gov:'자치령(덴마크)',econ:'혼합경제',desc:'세계에서 가장 큰 섬으로 대부분 얼음으로 덮여 있어요.'},

  // ===== 남아메리카 =====
  'Brazil':{iso2:'BR',ko:'브라질 연방공화국',en:'Federative Republic of Brazil',langs:['포르투갈어'],gov:'대통령제 연방공화국',econ:'자본주의',desc:'아마존과 축구, 삼바의 남미 최대 국가예요.'},
  'Argentina':{iso2:'AR',ko:'아르헨티나 공화국',en:'Argentine Republic',langs:['스페인어'],gov:'대통령제 연방공화국',econ:'자본주의',desc:'팜파스 초원과 탱고로 유명한 남미 국가예요.'},
  'Chile':{iso2:'CL',ko:'칠레 공화국',en:'Republic of Chile',langs:['스페인어'],gov:'대통령제 공화국',econ:'자본주의',desc:'안데스와 태평양 사이 길게 뻗은 나라예요.'},
  'Peru':{iso2:'PE',ko:'페루 공화국',en:'Republic of Peru',langs:['스페인어','케추아어'],gov:'대통령제 공화국',econ:'자본주의',desc:'잉카 문명과 마추픽추의 나라예요.'},
  'Colombia':{iso2:'CO',ko:'콜롬비아 공화국',en:'Republic of Colombia',langs:['스페인어'],gov:'대통령제 공화국',econ:'자본주의',desc:'커피와 카리브·태평양 해안을 가진 나라예요.'},
  'Venezuela':{iso2:'VE',ko:'베네수엘라 볼리바르공화국',en:'Bolivarian Republic of Venezuela',langs:['스페인어'],gov:'대통령제 연방공화국',econ:'혼합경제(석유)',desc:'세계 최대 석유 매장량을 가진 남미 국가예요.'},

  // ===== 오세아니아 =====
  'Australia':{iso2:'AU',ko:'오스트레일리아 연방',en:'Commonwealth of Australia',langs:['영어'],gov:'입헌군주제·의원내각제 연방국',econ:'자본주의',desc:'대륙이자 나라인 남반구의 큰 섬이에요.'},
  'New Zealand':{iso2:'NZ',ko:'뉴질랜드',en:'New Zealand',langs:['영어','마오리어'],gov:'입헌군주제·의원내각제',econ:'자본주의',desc:'초록 자연과 마오리 문화의 섬나라예요.'},
  'Papua New Guinea':{iso2:'PG',ko:'파푸아뉴기니 독립국',en:'Independent State of Papua New Guinea',langs:['영어','톡피신'],gov:'입헌군주제·의원내각제',econ:'혼합경제',desc:'수백 개 언어가 쓰이는 태평양의 섬나라예요.'},
  'Fiji':{iso2:'FJ',ko:'피지 공화국',en:'Republic of Fiji',langs:['영어','피지어'],gov:'의원내각제 공화국',econ:'자본주의',desc:'남태평양의 아름다운 섬 관광국이에요.'},
};

// 대륙 → 대표 언어(폴백용, 표에 없는 국가에 사용). 실제 언어는 아니고 힌트 수준.
export const CONT_HINT = {
  asia:'아시아', europe:'유럽', africa:'아프리카', oceania:'오세아니아', na:'북아메리카', sa:'남아메리카', ant:'남극',
};
