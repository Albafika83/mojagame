// army.js
// Ce script affiche les armées autour des communautés selon la feuille 'Armies' de Google Sheets.

async function fetchArmyData() {
    const armyData = await fetchSheetData('Armies');
    const armies = {};
    if (armyData.length > 1) {
      const rows = armyData.slice(1);
      rows.forEach(row => {
        const [community, basic, modern, future] = row;
        armies[community?.trim()] = {
          basic: parseInt(basic) || 0,
          modern: parseInt(modern) || 0,
          future: parseInt(future) || 0
        };
      });
    }
    return armies;
  }
  
  function drawArmy(ctx, communities) {
    fetchArmyData().then(armies => {
      ctx.font = 'bold 12px Arial';
      ctx.fillStyle = 'black';
      communities.forEach(comm => {
        const army = armies[comm.name];
        if (army) {
          const offsets = [
            { label: '🪖 Basic', value: army.basic, x: -30, y: -40 },
            { label: '💥 Modern', value: army.modern, x: 30, y: -40 },
            { label: '🚀 Future', value: army.future, x: 0, y: 40 }
          ];
          offsets.forEach(offset => {
            if (offset.value > 0) {
              ctx.fillText(`${offset.label}: ${offset.value}`, comm.x + offset.x, comm.y + offset.y);
            }
          });
        }
      });
    }).catch(error => console.error('Erreur lors de la récupération des armées:', error));
  }
  