const apiKey = 'AIzaSyDctNVWQhbsQMEDfJDXI30emaTd8mtviEY';
const sheetId = '1JbElBBvoEWvkyJ8aWhmSTh3MnMDEfHu9K3vaiyuNZ7s';

let trackingData;
let teamNames = new Set();

async function fetchGoogleSheetData(sheetName, range) {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}!${range}?key=${apiKey}`);
    const data = await response.json();
    return data.values;
}

async function populateTeamSelect() {
    try {
        const data = await fetchGoogleSheetData("tracking(M)", "B3:B1000");
        if (!data || !Array.isArray(data)) {
            console.error("Data is not an array or is undefined:", data);
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
        console.error("Error fetching or processing data:", error);
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
            performanceData[team].averageTasks = Math.round(performanceData[team].tasksCompleted / performanceData[team].activeMembers);
            performanceData[team].averageQuality = Math.round(performanceData[team].quality / performanceData[team].activeMembers);
        }
    });

    const sortedTeams = Object.entries(performanceData).sort((a, b) => {
        return b[1].averageTasks - a[1].averageTasks;
    });

    const topTeamsDiv = document.getElementById("topTeamText");
    const topTeam = sortedTeams[0];
    if (topTeam && topTeam[1].activeMembers > 0) {
        topTeamsDiv.innerHTML = `
            <strong>${topTeam[0]}</strong> with average of 
            <strong>${topTeam[1].averageTasks}</strong> tasks and 
            <strong>${topTeam[1].averageQuality}</strong> quality points per active member 
            (${topTeam[1].activeMembers} active members)`;
    } else {
        topTeamsDiv.innerHTML = `<strong>N/A</strong>`;
    }

    const teamRankingDiv = document.getElementById("teamRanking");
    const teamRankingHtml = sortedTeams.map((team, index) => {
        if (team[1].activeMembers > 0) {
            return `${index + 1}. <strong>${team[0]}</strong>: 
                    Average <strong>${team[1].averageTasks}</strong> tasks, 
                    <strong>${team[1].averageQuality}</strong> quality points 
                    (${team[1].activeMembers} active members)`;
        }
        return '';
    }).filter(Boolean).join('<br>');
    teamRankingDiv.innerHTML = `${teamRankingHtml || 'No teams with active members.'}`;
}

function calculateIndividualPerformance() {
    const individualPerformance = [];

    for (const team in teamNames) {
        trackingData.forEach(row => {
            if (row[1] === team) {
                const tasksCompleted = parseInt(row[13]) || 0;
                const quality = parseInt(row[12]) || 0;

                if (tasksCompleted > 1 && quality > 1) {
                    individualPerformance.push({
                        name: row[5],
                        tasksCompleted: tasksCompleted,
                        quality: quality
                    });
                }
            }
        });
    }

    const topThreeTasks = individualPerformance.sort((a, b) => b.tasksCompleted - a.tasksCompleted).slice(0, 3);
    const topThreeTasksHtml = topThreeTasks.map(person => {
        return `<strong>${person.name}</strong>: <strong>${person.tasksCompleted}</strong> tasks`;
    }).join('<br>');
    document.getElementById("topThreeTasks").innerHTML = `${topThreeTasksHtml || 'N/A'}`;

    const topThreeQuality = individualPerformance.sort((a, b) => b.quality - a.quality).slice(0, 3);
    const topThreeQualityHtml = topThreeQuality.map(person => {
        return `<strong>${person.name}</strong>: <strong>${person.quality}</strong> quality points`;
    }).join('<br>');
    document.getElementById("topThreeQuality").innerHTML = `${topThreeQualityHtml || 'N/A'}`;
}

const encouragementMessages = [
    "Keep up the hard work!",
    "You're making progress!",
    "Stay focused on your goals!",
    "Your effort is paying off!",
    "Keep pushing forward!",
    "You're doing great work!",
    "Stay committed!",
    "Your dedication shows!",
    "Keep striving for success!",
    "You're on the right path!",
    "Stay motivated!",
    "Your hard work matters!",
    "Keep aiming high!",
    "You're achieving your goals!",
    "Stay determined!",
    "Your persistence is key!",
    "Keep improving!",
    "You're building success!",
    "Stay on track!",
    "Your work is valuable!",
    "Keep reaching for more!",
    "You're making a difference!",
    "Stay productive!",
    "Your focus is impressive!",
    "Keep setting new goals!",
    "You're a hard worker!",
    "Stay ambitious!",
    "Your progress is inspiring!",
    "Keep challenging yourself!",
    "You're a go-getter!",
    "Stay driven!",
    "Your efforts are noticed!",
    "Keep up the momentum!",
    "You're achieving great things!",
    "Stay on your path!",
    "Your work ethic is strong!",
    "Keep pushing your limits!",
    "You're a dedicated worker!",
    "Stay on your journey!",
    "Your goals are within reach!",
    "Keep striving for excellence!",
    "You're a valuable team member!",
    "Stay focused on success!",
    "Your hard work is inspiring!",
    "Keep building your future!",
    "You're a committed worker!",
    "Stay on your mission!",
    "Your dedication is admirable!",
    "Keep moving forward!",
    "You're a determined worker!"
];

function showRandomEncouragementMessage() {
    const messageElement = document.getElementById("encouragementMessage");
    const randomIndex = Math.floor(Math.random() * encouragementMessages.length);
    messageElement.textContent = encouragementMessages[randomIndex];
}

window.onload = function() {
    populateTeamSelect(); // Populate team select on load
    const teamSelect = document.getElementById("teamSelect");
    teamSelect.addEventListener('change', () => {
        updateTable();
    });

    // Show a random encouragement message every 5 minutes
    showRandomEncouragementMessage();
    setInterval(showRandomEncouragementMessage, 300000); // 300000 ms = 5 minutes
};
