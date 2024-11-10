const apiKey = 'AIzaSyDctNVWQhbsQMEDfJDXI30emaTd8mtviEY';
const sheetId = '1EbKvgMRzVKucfGuIOUqJbfncI194MNGJO-9ZVmIJnIw';

let trackingData;
let teamNames = new Set();

async function fetchGoogleSheetData(sheetName, range) {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}!${range}?key=${apiKey}`);
    const data = await response.json();
    
    // التحقق من وجود البيانات بالشكل الصحيح
    if (!data || !data.values || !Array.isArray(data.values)) {
        console.error("البيانات غير صحيحة أو غير موجودة:", data);
        return []; // إرجاع مصفوفة فارغة في حال حدوث خطأ
    }
    return data.values;
}

async function populateTeamSelect() {
    try {
        const data = await fetchGoogleSheetData("tracking(M)", "B3:B1000");

        // التحقق من أن البيانات موجودة وهي مصفوفة
        if (!data || !Array.isArray(data)) {
            console.error("البيانات ليست مصفوفة أو غير موجودة:", data);
            return;
        }

        data.forEach(row => {
            if (row[0]) {
                teamNames.add(row[0]);
            }
        });

        const teamSelect = document.getElementById("teamSelect");
        teamSelect.innerHTML = '<option value="">Select Team</option>';
        teamNames.forEach(team => {
            const option = document.createElement("option");
            option.value = team;
            option.textContent = team;
            teamSelect.appendChild(option);
        });
    } catch (error) {
        console.error("حدث خطأ أثناء جلب أو معالجة البيانات:", error);
    }
}

async function updateTable() {
    const teamSelect = document.getElementById("teamSelect");
    const selectedTeam = teamSelect.value;
    const teamTableBody = document.getElementById("teamTableBody");
    const loader = document.getElementById("loader");

    if (!selectedTeam) {
        teamTableBody.innerHTML = '<tr><td colspan="7">Please select a team.</td></tr>';
        return;
    }

    loader.style.display = 'block';

    trackingData = await fetchGoogleSheetData("tracking(M)", "A1:Z1000");

    loader.style.display = 'none';
    teamTableBody.innerHTML = '';

    // Filter and sort the data based on qualityForAll
    const teamData = trackingData.filter(row => row[1] === selectedTeam)
        .map(row => ({
            device: row[0] || "N/A",
            email: row[2] || "N/A",
            name: row[5] || "N/A",
            tasksCompleted: row[13] || "N/A",
            quality: parseFloat(row[12]) || 0,
            qualityForAll: parseFloat(row[7]) || 0,
            lastTaskLink: row[24] || ""
        }))
        .sort((a, b) => {
            // Sort by qualityForAll in descending order
            const qualityA = parseFloat(a.qualityForAll) || 0;
            const qualityB = parseFloat(b.qualityForAll) || 0;
            return qualityB - qualityA;
        });

    // Add sorted data to the table
    teamData.forEach((member, index) => {
        const rowElement = document.createElement("tr");
        const tasksColor = member.tasksCompleted < 70 ? 'red' : 'green';
        const qualityColor = member.quality < 75 ? 'red' : 'green';

        // Determine rank suffix
        const rankSuffix = (index + 1) === 1 ? 'st' : (index + 1) === 2 ? 'nd' : (index + 1) === 3 ? 'rd' : 'th';
        const rankDisplay = `<span style="color: #daa520;">${index + 1}${rankSuffix} ⭐</span>`;

        rowElement.innerHTML = `
            <td>${member.device}</td>
            <td>${member.email}</td>
            <td>${member.name}</td>
            <td>${member.qualityForAll} ${rankDisplay}</td>
            <td style="color: ${tasksColor};">${member.tasksCompleted}</td>
            <td style="color: ${qualityColor};">${member.quality}</td>
            <td>
                ${member.lastTaskLink ? `<button onclick="copyToClipboard('${member.lastTaskLink}')" class="copy-button">
                    <i class="fas fa-copy"></i> Copy Last Task
                </button>` : 'N/A'}
            </td>
        `;
        rowElement.classList.add('fade-in');
        teamTableBody.appendChild(rowElement);

        setTimeout(() => {
            rowElement.classList.add('visible');
        }, index * 100);
    });

    calculateTeamPerformance();
    calculateIndividualPerformance();
    updateTopHeart();
    showRandomBalloons();

    // Auto-refresh the table every minute to keep rankings updated
    setTimeout(updateTable, 300000);
}

function showRandomBalloons() {
    const balloonCount = Math.floor(Math.random() * 26) + 15;
    const balloonContainer = document.querySelectorAll('.balloon');
    const symbols = ['🎈', '❤️', '🎉', '✨', '🎊', '🎁', '💪', '😎', '🏆', '🔥', '💯', '🍾', '🌟'];

    balloonContainer.forEach(balloon => {
        balloon.style.opacity = '0';
    });

    for (let i = 0; i < balloonCount; i++) {
        const balloon = document.createElement('div');
        balloon.className = 'balloon';
        balloon.innerHTML = symbols[Math.floor(Math.random() * symbols.length)];
        balloon.style.position = 'absolute';
        balloon.style.left = Math.random() * 100 + 'vw';
        balloon.style.top = Math.random() * 100 + 'vh';
        balloon.style.opacity = '1';
        balloon.style.transition = 'opacity 0.5s';
        document.body.appendChild(balloon);

        setTimeout(() => {
            balloon.style.transform = `translateY(-${Math.random() * 50 + 50}px)`;
        }, 100);

        setTimeout(() => {
            balloon.style.opacity = '0';
            setTimeout(() => {
                balloon.remove();
            }, 500);
        }, 5000);
    }
}

function updateTopHeart() {
    const teamTableBody = document.getElementById("teamTableBody");
    const rows = teamTableBody.getElementsByTagName("tr");
    let topTaskTodayMember = null;
    let topQualityTodayMember = null;

    for (let row of rows) {
        const tasksCompletedToday = parseInt(row.cells[4].innerText) || 0;
        const qualityPerDay = parseFloat(row.cells[5].innerText) || 0;

        if (tasksCompletedToday > 1 && (!topTaskTodayMember || tasksCompletedToday > topTaskTodayMember.tasks)) {
            topTaskTodayMember = { row, tasks: tasksCompletedToday };
        }
        if (qualityPerDay > 1 && (!topQualityTodayMember || qualityPerDay > topQualityTodayMember.quality)) {
            topQualityTodayMember = { row, quality: qualityPerDay };
        }
    }

    const hearts = document.querySelectorAll('.heart');
    hearts.forEach(heart => heart.remove());

    if (topTaskTodayMember) {
        const heart = document.createElement('span');
        heart.className = 'heart';
        heart.innerHTML = '❤️';
        topTaskTodayMember.row.cells[2].appendChild(heart);
    }

    if (topQualityTodayMember) {
        const heart = document.createElement('span');
        heart.className = 'heart';
        heart.innerHTML = '❤️';
        topQualityTodayMember.row.cells[2].appendChild(heart);
    }
}

function copyToClipboard(link) {
    navigator.clipboard.writeText(link).then(() => {
        showNotification("Link copied to clipboard!");
    }).catch(err => {
        console.error("Failed to copy link: ", err);
    });
}

function showNotification(message) {
    const notification = document.getElementById("notification");
    notification.textContent = message;
    notification.style.display = 'block';
    notification.classList.add('show');

    setTimeout(() => {
        notification.style.display = 'none';
        notification.classList.remove('show');
    }, 3000); // Hide after 3 seconds
}

function calculateTeamPerformance() {
    const performanceData = {};

    teamNames.forEach(team => {
        performanceData[team] = {
            tasksCompleted: 0,
            quality: 0,
            activeMembers: 0,
            averageTasks: 0,
            averageQuality: 0
        };

        trackingData.forEach(row => {
            if (row[1] === team) {
                const tasksCompleted = parseInt(row[13]) || 0;
                const quality = parseInt(row[12]) || 0;

                if (tasksCompleted > 1 && quality > 1) {
                    performanceData[team].tasksCompleted += tasksCompleted;
                    performanceData[team].quality += quality;
                    performanceData[team].activeMembers++;
                }
            }
        });

        if (performanceData[team].activeMembers > 0) {
            performanceData[team].averageTasks = performanceData[team].tasksCompleted / performanceData[team].activeMembers;
            performanceData[team].averageQuality = performanceData[team].quality / performanceData[team].activeMembers;
        }
    });

    updateTeamLeaderboard(performanceData);
}

function updateTeamLeaderboard(performanceData) {
    const leaderboard = document.getElementById("leaderboard");
    leaderboard.innerHTML = '';

    const sortedTeams = Object.keys(performanceData).sort((a, b) => {
        const teamA = performanceData[a];
        const teamB = performanceData[b];
        return teamB.averageQuality - teamA.averageQuality;
    });

    sortedTeams.forEach(team => {
        const teamInfo = performanceData[team];
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${team}</td>
            <td>${teamInfo.averageTasks.toFixed(2)}</td>
            <td>${teamInfo.averageQuality.toFixed(2)}</td>
        `;
        leaderboard.appendChild(row);
    });
}

function calculateIndividualPerformance() {
    const teamTableBody = document.getElementById("teamTableBody");
    const rows = teamTableBody.getElementsByTagName("tr");

    let highestQuality = 0;
    let highestQualityRow = null;

    for (let row of rows) {
        const quality = parseFloat(row.cells[5].innerText) || 0;

        if (quality > highestQuality) {
            highestQuality = quality;
            highestQualityRow = row;
        }
    }

    if (highestQualityRow) {
        highestQualityRow.classList.add("top-quality");
    }
}

// Call populateTeamSelect to initialize the dropdown
populateTeamSelect();
