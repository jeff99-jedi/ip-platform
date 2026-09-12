// 기업마당 API 프록시 - Vercel Serverless Function
const BIZINFO_URL = 'https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 허용' });

  const {
    apiKey   = '2g2gae',
    keyword  = '',
    field    = '',
    hashtags = '',
  } = req.body || {};

  try {
    const params = new URLSearchParams({
      crtfcKey:  apiKey,
      dataType:  'json',
      searchCnt: '200',
      pageUnit:  '200',
      pageIndex: '1',
    });
    if (field)    params.append('searchLclasId', field);
    if (hashtags) params.append('hashtags', hashtags);

    const response = await fetch(`${BIZINFO_URL}?${params}`, {
      method: 'GET',
      headers: { 'User-Agent': 'IPPlatform/1.0' },
    });

    if (!response.ok) throw new Error(`기업마당 응답 오류: ${response.status}`);

    const json = await response.json();
    const raw   = json?.jsonArray || json;
    const items = Array.isArray(raw?.item) ? raw.item : [];

    // 키워드 서버 필터
    const filtered = keyword
      ? items.filter(it =>
          (it.pblancNm    || '').includes(keyword) ||
          (it.bsnsSumryCn || '').includes(keyword) ||
          (it.hashTags    || '').includes(keyword) ||
          (it.jrsdInsttNm || '').includes(keyword)
        )
      : items;

    return res.status(200).json({
      success: true,
      total:   filtered.length,
      items:   filtered,
    });

  } catch (e) {
    console.error('프록시 오류:', e.message);
    return res.status(500).json({ error: e.message });
  }
};
