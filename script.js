/************************************************************
 *    Configuration
 ************************************************************/
const canvas = document.getElementById('mojaCanvas');
const ctx = canvas.getContext('2d');
const resourceTable = document.getElementById('resourceTable');
const mapImage = new Image();
mapImage.src = 'map.png'; // Your map background image

const plantDataDiv = document.getElementById('plantDataDiv');
const plantDataContent = document.getElementById('plantDataContent');

// Your API key and spreadsheet ID
const API_KEY = 'AIzaSyDOKp-na44t8EUZw9Bi8JItSupe_tFEFlE';
let SPREADSHEET_ID = document.getElementById('spreadsheetSelect').value;

// Array to store all communities
let communities = [];

/************************************************************
 *   Sheet Selection
 ************************************************************/
const spreadsheetSelect = document.getElementById('spreadsheetSelect');
spreadsheetSelect.addEventListener('change', (e) => {
  SPREADSHEET_ID = e.target.value;
  // Reload data
  fetchPlantData();
  fetchData();
});

/************************************************************
 *   Fetch Data from a Sheet
 ************************************************************/
async function fetchSheetData(sheetName) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}?key=${API_KEY}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data.values || [];
  } catch (error) {
    console.error(`Error fetching '${sheetName}':`, error);
    return [];
  }
  
}

/************************************************************
 *   Display 'Plant Data' in the Corner
 ************************************************************/
async function fetchPlantData() {
  const plantData = await fetchSheetData('Plant Data');
  if (plantData.length > 1) {
    const headers = plantData[0];
    const rows = plantData.slice(1);

    let html = '<table id="plantDataTable">';
    html += '<tr>';
    headers.forEach(header => {
      html += `<th>${header}</th>`;
    });
    html += '</tr>';

    rows.forEach(row => {
      html += '<tr>';
      row.forEach(cell => {
        html += `<td>${cell}</td>`;
      });
      html += '</tr>';
    });
    html += '</table>';

    plantDataContent.innerHTML = html;
  } else {
    plantDataContent.innerHTML = "No data for 'Plant Data'.";
  }
}

/************************************************************
 *   Dynamically Build Communities (Resources + Plants Built)
 ************************************************************/
async function fetchData() {
  // Clear the old array
  communities = [];

  // 1) Fetch 'Ressources' sheet
  const resourcesData = await fetchSheetData('Ressources');

  // Check if there is at least 1 row after the header
  if (resourcesData.length > 1) {
    // Ignore the first row (headers)
    const rows = resourcesData.slice(1);

    rows.forEach((row, index) => {
      const name = row[0]?.trim() || `Community${index}`;
      // Dynamically position communities
      const x = 200 + (index * 100);  // Adjust as needed
      const y = 200 + (index * 50);
      const color = pickColor(index); // See pickColor function below

      // Build the community object
      const comm = {
        name,
        water: row[1] || '?',
        biomass: row[2] || '?',
        wood: row[3] || '?',
        wind: row[4] || '?',
        sea: row[5] || '?',
        sun: row[6] || '?',
        credits: row[7] || '?',
        x,
        y,
        color
      };
      communities.push(comm);
    });
  }

  // 2) Fetch 'Plants Built' sheet to complete
  const plantsData = await fetchSheetData('Plants Built');

  if (plantsData.length > 1) {
    const rows = plantsData.slice(1);
    // For each community, find the corresponding row
    communities.forEach(comm => {
      const row = rows.find(r => r[0]?.trim().toLowerCase() === comm.name.toLowerCase());
      if (row) {
        [comm.hydro, comm.biogas, comm.biomassPlant, comm.geothermal, comm.windPlant, comm.solar, comm.tidal, comm.totalEnergy] = row.slice(1);
      }
    });
  }

  // 3) Fetch 'Ressources Gains' sheet
  await fetchResourceGains();
  
  if (communities.length > 0) {
    restoreCommunityPositions();
  }
  // Final drawing
  drawScene();
  displayTotalEnergy(totalEnergy);

}

async function fetchResourceGains() {
  const resourceGainsData = await fetchSheetData('Ressources Gains');
  if (resourceGainsData.length > 1) {
    const headers = resourceGainsData[0];
    const rows = resourceGainsData.slice(1);

    // Générer le tableau HTML
    let html = '<table>';
    html += '<tr>';
    headers.forEach(header => {
      html += `<th>${header}</th>`;
    });
    html += '</tr>';

    rows.forEach(row => {
      html += '<tr>';
      row.forEach(cell => {
        html += `<td>${cell}</td>`;
      });
      html += '</tr>';
    });
    html += '</table>';

    // Afficher le tableau dans le conteneur
    document.getElementById('resourceGainsContent').innerHTML = html;
  } else {
    document.getElementById('resourceGainsContent').innerHTML = "No data for 'Ressources Gains'.";
  }
}

/************************************************************
 *   Dynamic Colors
 ************************************************************/
function pickColor(index) {
  // Simple palette (cycle)
  const palette = ['green', 'red', 'blue', 'black', 'orange', 'purple', 'pink', 'brown'];
  return palette[index % palette.length];
}

/************************************************************
 *   Hover on Canvas
 ************************************************************/
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // Determine if there is a community nearby
  const hoveredCommunity = communities.find(
    comm => Math.hypot(mouseX - comm.x, mouseY - comm.y) < 40
  );
  
  if (hoveredCommunity) {
    resourceTable.style.left = `${e.pageX + 10}px`;
    resourceTable.style.top = `${e.pageY + 10}px`;
    resourceTable.style.display = 'block';
    resourceTable.innerHTML = `
      <div class="flex-container">
        <div>
          <strong>${hoveredCommunity.name}</strong><br>
          💧 Water: ${hoveredCommunity.water}<br>
          🌿 Bio: ${hoveredCommunity.biomass}<br>
          🌲 Wood: ${hoveredCommunity.wood}<br>
          💨 Wind: ${hoveredCommunity.wind}<br>
          🌊 Sea: ${hoveredCommunity.sea}<br>
          ☀️ Sun: ${hoveredCommunity.sun}<br>
          💰 Credits: ${hoveredCommunity.credits}<br>
        </div>
        <div>
          <strong>Built Plants</strong><br>
          💧 Hydro: ${hoveredCommunity.hydro || 0}<br>
          🌿 Biogas: ${hoveredCommunity.biogas || 0}<br>
          🌲 Biomass: ${hoveredCommunity.biomassPlant || 0}<br>
          🌋 Geothermal: ${hoveredCommunity.geothermal || 0}<br>
          💨 Wind: ${hoveredCommunity.windPlant || 0}<br>
          ☀️ Solar: ${hoveredCommunity.solar || 0}<br>
          🌊 Tidal: ${hoveredCommunity.tidal || 0}<br>
          ⚡ Total: ${hoveredCommunity.totalEnergy || 0}<br>
        </div>
      </div>
    `;
  } else {
    resourceTable.style.display = 'none';
  }
});


/************************************************************
 *   Initialization
 ************************************************************/
if (localStorage.getItem('communityPositions')) {
  restoreCommunityPositions();
} else {
  console.warn('Aucune position sauvegardée trouvée.');
}

drawScene();


/************************************************************
 *   Draw Map + Communities
 ************************************************************/
function drawMap() {
  ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
}

function drawCommunities() {
  communities.forEach(comm => {
    ctx.beginPath();
    ctx.arc(comm.x, comm.y, 20, 0, Math.PI * 2);
    ctx.fillStyle = comm.color;
    ctx.fill();
    ctx.stroke();
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    const initials = comm.name.split(' ').map(word => word.charAt(0).toUpperCase()).join('').slice(0, 2);
    ctx.fillText(initials, comm.x, comm.y);
  });
}

/************************************************************
 *   Periodic Updates
 ************************************************************/
setInterval(fetchData, 5000); // Reload resources/plants every 5 seconds

mapImage.onload = () => {
  fetchPlantData();
  fetchData();
  drawScene();
};

mapImage.onerror = () => {
  console.error('Failed to load map image.');
};

/************************************************************
 *   Drag-and-Drop Functionality
 ************************************************************/
let isDragging = false;
let draggedCommunity = null;
let communityPositions = JSON.parse(localStorage.getItem('communityPositions')) || {};

// Save community positions to localStorage
function saveCommunityPositions() {
  try {
    if (communityPositions && typeof communityPositions === 'object') {
      localStorage.setItem('communityPositions', JSON.stringify(communityPositions));
      console.log('Positions sauvegardées avec succès');
    } else {
      console.warn('communityPositions est invalide');
    }
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des positions:', error);
  }
}

// Restore community positions from localStorage
function restoreCommunityPositions() {
  const stored = localStorage.getItem('communityPositions');
  console.log('Données chargées depuis localStorage:', stored); // Ajout de log

  if (stored) {
    const parsed = JSON.parse(stored);
    communities.forEach(comm => {
      if (parsed[comm.name]) {
        const saved = parsed[comm.name];
        if (typeof saved.x === 'number' && typeof saved.y === 'number') {
          comm.x = saved.x;
          comm.y = saved.y;
          console.log(`Position restaurée pour ${comm.name}: X=${comm.x}, Y=${comm.y}`);
        }
      }
    });
    drawScene(); // Important : Redessiner après restauration
  } else {
    console.warn('Aucune position sauvegardée.');
  }
}

// Mouse down event: Start dragging
canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // Find the community being dragged
  draggedCommunity = communities.find(comm => Math.hypot(mouseX - comm.x, mouseY - comm.y) < 20);
  isDragging = Boolean(draggedCommunity);

  if (isDragging) {
    e.preventDefault(); // Prevent text selection while dragging
  }
});

// Mouse move event: Update community position while dragging
canvas.addEventListener('mousemove', (e) => {
  if (isDragging && draggedCommunity) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Update community position (ensure it stays within canvas bounds)
    draggedCommunity.x = Math.max(20, Math.min(canvas.width - 20, mouseX));
    draggedCommunity.y = Math.max(20, Math.min(canvas.height - 20, mouseY));

    // Update communityPositions
    communityPositions[draggedCommunity.name] = { 
      x: draggedCommunity.x, 
      y: draggedCommunity.y 
    };

    // Save positions to localStorage immediately
    saveCommunityPositions();

    // Redraw the scene
    requestAnimationFrame(drawScene);
  }
});

// Mouse up event: Stop dragging
canvas.addEventListener('mouseup', () => {
  if (draggedCommunity) {
    saveCommunityPositions(); // Save positions after dragging
  }
  isDragging = false;
  draggedCommunity = null;
});

// Mouse leave event: Stop dragging if the mouse leaves the canvas
canvas.addEventListener('mouseleave', () => {
  if (draggedCommunity) {
    saveCommunityPositions(); // Save positions if dragging stops abruptly
  }
  isDragging = false;
  draggedCommunity = null;
});

// Initial drawing
drawScene();

function drawScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawMap();
  drawCommunities();
  displayTotalEnergy();
}

/************************************************************
 *   Calculate Total Energy
 ************************************************************/
function calculateTotalEnergy() {
  let totalEnergy = 0;
  communities.forEach(comm => {
    totalEnergy += parseInt(comm.totalEnergy) || 0;
  });
  return totalEnergy;
}

/************************************************************
 *   Display Total Energy in Top-Left Corner (Persistent)
 ************************************************************/
function displayTotalEnergy() {
  const totalEnergy = calculateTotalEnergy();
  ctx.save();
  ctx.font = 'bold 16px Arial';
  ctx.fillStyle = 'black';
  ctx.fillRect(10, 10, 220, 30);
  ctx.fillStyle = 'white';
  ctx.fillText(`Total Energy: ${totalEnergy} kWh`, 120, 30);
  ctx.restore();
}



