// 중소벤처24 공고정보 API 프록시
const API_URL = 'https://portal.smes.go.kr/ione-gw/api/pblanc/list';
const DEFAULT_TOKEN = 'jyoG5kwh2MEhZ2Hcb9Di9BC5gkbc7bm/8s4y4YlKXRkCu8dD9GmD7Tdr8mG46RUIqKXSp4PM26SP6gKY5/li/A==';

// 지역코드 맵
const AREA_MAP = {
  '서울': '1100', '부산': '2600', '대구': '2700', '인천': '2800',
  '광주': '2900', '대전': '3000', '울산': '3100', '세종': '3611',
  '경기': '4100', '강원': '4200', '충북': '4300', '충남': '4400',
  '전북': '4500', '전남': '4600', '경북': '4700', '경남': '4800', '제주': '5000',
};

// 사업유형코드 맵
const BIZ_TYPE_MAP = {
  '금융': 'PC10', '기술': 'PC20', '인력': 'PC30', '수출': 'PC40',
  '내수': 'PC50', '창업': 'PC60', '경영': 'PC70', '소상공인': 'PC80',
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 허용' });

  const {
    token    = DEFAULT_TOKEN,
    keyword  = '',
    region   = '',
    bizType  = '',
    strDt    = '',
    endDt    = '',
  } = req.body || {};

  try {
    // 파라미터 구성
    const params = new URLSearchParams();
    params.append('token', token);
    params.append('html', 'no'); // HTML 태그 제거
    if (strDt)   params.append('strDt', strDt);
    if (endDt)   params.append('endDt', endDt);
    if (region  && AREA_MAP[region])   params.append('areaCd', AREA_MAP[region]);
    if (bizType && BIZ_TYPE_MAP[bizType]) params.append('bizTypeCd', BIZ_TYPE_MAP[bizType]);

    const url = `${API_URL}?${params.toString()}`;
    console.log('호출 URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) throw new Error(`API 응답 오류: ${response.status}`);

    const json = await response.json();
    console.log('resultCd:', json.resultCd, '건수:', json.data?.length);

    // 응답 구조 디버깅 로그
    console.log('전체 응답 키:', Object.keys(json));
    console.log('resultCd:', json.resultCd);
    console.log('resultMsg:', json.resultMsg);
    console.log('data 존재:', !!json.data);
    console.log('data 타입:', typeof json.data);

    // 오류 코드 처리 (문자열/숫자 모두 대응)
    const cd = String(json.resultCd ?? '');
    if (cd === '9')  throw new Error('인증키 오류: 허용되지 않은 인증키');
    if (cd === '10') throw new Error('인증키 오류: 해당 API 인증키가 아님');
    if (cd === '14') throw new Error('허용되지 않은 IP 접근');

    // data 배열 찾기 (다양한 구조 대응)
    let items = json.data || json.list || json.items || json.result || [];
    if (!Array.isArray(items)) items = [];

    // 키워드 필터 (서버에서 처리)
    if (keyword) {
      const kw = keyword.toLowerCase();
      items = items.filter(it =>
        (it.pblancNm      || '').toLowerCase().includes(kw) ||
        (it.policyCnts    || '').toLowerCase().includes(kw) ||
        (it.sportTrget    || '').toLowerCase().includes(kw) ||
        (it.sportInsttNm  || '').toLowerCase().includes(kw) ||
        (it.detailBsnsNm  || '').toLowerCase().includes(kw)
      );
    }

    return res.status(200).json({
      success:  true,
      resultCd: json.resultCd,
      total:    items.length,
      items,
    });

  } catch (e) {
    console.error('프록시 오류:', e.message);
    return res.status(500).json({ error: e.message });
  }
};
