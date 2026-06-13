(function () {
  async function loadMercenaryMasterData() {
    const response = await fetch('/data/mercenaries.master.json?v=221', {
      cache: 'no-cache'
    });
    if (!response.ok) {
      throw new Error(`용병 마스터 데이터를 불러오지 못했습니다. (${response.status})`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  window.MercenaryDataLoader = {
    loadMercenaryMasterData
  };
}());
