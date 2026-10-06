const page =
  document.body.dataset.page;


function escapeHtml(value) {
  const div =
    document.createElement(
      "div"
    );

  div.textContent =
    String(
      value ?? ""
    );

  return div.innerHTML;
}


async function api(
  url,
  options = {}
) {
  const response =
    await fetch(
      url,
      {
        headers: {
          "Content-Type":
            "application/json",

          ...(options.headers || {})
        },

        ...options
      }
    );


  let data = {};

  try {
    data =
      await response.json();
  } catch {
    data = {};
  }


  if (!response.ok) {
    throw new Error(
      data.error ||
      "Something went wrong."
    );
  }


  return data;
}


/* AUTH PAGE */

if (
  page === "auth"
) {
  const loginTab =
    document.getElementById(
      "loginTab"
    );

  const registerTab =
    document.getElementById(
      "registerTab"
    );

  const loginForm =
    document.getElementById(
      "loginForm"
    );

  const registerForm =
    document.getElementById(
      "registerForm"
    );

  const authMessage =
    document.getElementById(
      "authMessage"
    );


  function showAuthMessage(
    message
  ) {
    authMessage.textContent =
      message;

    authMessage.classList.remove(
      "hidden"
    );
  }


  function clearAuthMessage() {
    authMessage.classList.add(
      "hidden"
    );
  }


  loginTab.addEventListener(
    "click",
    () => {
      clearAuthMessage();

      loginTab.classList.add(
        "active"
      );

      registerTab.classList.remove(
        "active"
      );

      loginForm.classList.remove(
        "hidden"
      );

      registerForm.classList.add(
        "hidden"
      );
    }
  );


  registerTab.addEventListener(
    "click",
    () => {
      clearAuthMessage();

      registerTab.classList.add(
        "active"
      );

      loginTab.classList.remove(
        "active"
      );

      registerForm.classList.remove(
        "hidden"
      );

      loginForm.classList.add(
        "hidden"
      );
    }
  );


  loginForm.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      clearAuthMessage();


      try {
        await api(
          "/api/auth/login",
          {
            method: "POST",

            body:
              JSON.stringify({
                email:
                  document.getElementById(
                    "loginEmail"
                  ).value,

                password:
                  document.getElementById(
                    "loginPassword"
                  ).value
              })
          }
        );


        window.location.href =
          "/dashboard";

      } catch (error) {
        showAuthMessage(
          error.message
        );
      }
    }
  );


  registerForm.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      clearAuthMessage();


      try {
        await api(
          "/api/auth/register",
          {
            method: "POST",

            body:
              JSON.stringify({
                name:
                  document.getElementById(
                    "registerName"
                  ).value,

                email:
                  document.getElementById(
                    "registerEmail"
                  ).value,

                password:
                  document.getElementById(
                    "registerPassword"
                  ).value
              })
          }
        );


        window.location.href =
          "/dashboard";

      } catch (error) {
        showAuthMessage(
          error.message
        );
      }
    }
  );
}


/* DASHBOARD */

if (
  page === "dashboard"
) {
  const tournamentSelect =
    document.getElementById(
      "tournamentSelect"
    );

  const tournamentName =
    document.getElementById(
      "tournamentName"
    );

  const tournamentSport =
    document.getElementById(
      "tournamentSport"
    );

  const teamCount =
    document.getElementById(
      "teamCount"
    );

  const fixtureCount =
    document.getElementById(
      "fixtureCount"
    );

  const completedCount =
    document.getElementById(
      "completedCount"
    );

  const progressValue =
    document.getElementById(
      "progressValue"
    );

  const miniProgressBar =
    document.getElementById(
      "miniProgressBar"
    );

  const pendingMatchesBadge =
    document.getElementById(
      "pendingMatchesBadge"
    );

  const matchList =
    document.getElementById(
      "matchList"
    );

  const leaderboardBody =
    document.getElementById(
      "leaderboardBody"
    );

  const teamList =
    document.getElementById(
      "teamList"
    );

  const activityList =
    document.getElementById(
      "activityList"
    );

  const addTeamForm =
    document.getElementById(
      "addTeamForm"
    );

  const teamNameInput =
    document.getElementById(
      "teamNameInput"
    );

  const teamShortInput =
    document.getElementById(
      "teamShortInput"
    );

  const generateFixturesButton =
    document.getElementById(
      "generateFixturesButton"
    );

  const newTournamentButton =
    document.getElementById(
      "newTournamentButton"
    );

  const tournamentModal =
    document.getElementById(
      "tournamentModal"
    );

  const tournamentForm =
    document.getElementById(
      "tournamentForm"
    );

  const logoutButton =
    document.getElementById(
      "logoutButton"
    );

  const toast =
    document.getElementById(
      "toast"
    );


  let currentTournamentId =
    null;


  function showToast(
    message
  ) {
    toast.textContent =
      message;

    toast.classList.add(
      "show"
    );


    clearTimeout(
      showToast.timeout
    );


    showToast.timeout =
      setTimeout(
        () => {
          toast.classList.remove(
            "show"
          );
        },
        2300
      );
  }


  async function loadUser() {
    try {
      const data =
        await api(
          "/api/auth/me"
        );


      const user =
        data.user;


      document.getElementById(
        "sidebarUserName"
      ).textContent =
        user.name;


      document.getElementById(
        "sidebarUserEmail"
      ).textContent =
        user.email;


      document.getElementById(
        "userAvatar"
      ).textContent =
        user.name
          .charAt(0)
          .toUpperCase();

    } catch {
      window.location.href =
        "/";
    }
  }


  async function loadTournaments(
    preferredId = null
  ) {
    const data =
      await api(
        "/api/tournaments"
      );


    tournamentSelect.innerHTML =
      "";


    data.tournaments.forEach(
      tournament => {
        const option =
          document.createElement(
            "option"
          );

        option.value =
          tournament.id;

        option.textContent =
          tournament.name;

        tournamentSelect.appendChild(
          option
        );
      }
    );


    if (
      data.tournaments.length === 0
    ) {
      currentTournamentId =
        null;

      return;
    }


    const savedId =
      Number(
        localStorage.getItem(
          "scoreForgeTournament"
        )
      );


    const validPreferred =
      data.tournaments.some(
        tournament =>
          tournament.id ===
          Number(
            preferredId
          )
      );


    const validSaved =
      data.tournaments.some(
        tournament =>
          tournament.id ===
          savedId
      );


    currentTournamentId =
      validPreferred
        ? Number(
            preferredId
          )
        : validSaved
        ? savedId
        : data.tournaments[0].id;


    tournamentSelect.value =
      currentTournamentId;


    await loadTournament();
  }


  async function loadTournament() {
    if (
      !currentTournamentId
    ) {
      return;
    }


    const data =
      await api(
        `/api/tournaments/${currentTournamentId}`
      );


    localStorage.setItem(
      "scoreForgeTournament",
      currentTournamentId
    );


    renderTournament(
      data
    );
  }


  function renderTournament(
    data
  ) {
    const {
      tournament,
      teams,
      matches,
      leaderboard,
      activity
    } = data;


    tournamentName.textContent =
      tournament.name;

    tournamentSport.textContent =
      tournament.sport;


    const completed =
      matches.filter(
        match =>
          match.status ===
          "played"
      ).length;


    const pending =
      matches.length -
      completed;


    const progress =
      matches.length === 0
        ? 0
        : Math.round(
            (
              completed /
              matches.length
            ) *
            100
          );


    teamCount.textContent =
      teams.length;

    fixtureCount.textContent =
      matches.length;

    completedCount.textContent =
      completed;

    progressValue.textContent =
      `${progress}%`;

    miniProgressBar.style.width =
      `${progress}%`;

    pendingMatchesBadge.textContent =
      `${pending} pending`;


    renderMatches(
      matches
    );

    renderLeaderboard(
      leaderboard
    );

    renderTeams(
      teams
    );

    renderActivity(
      activity
    );
  }


  function renderMatches(
    matches
  ) {
    matchList.innerHTML =
      "";


    if (
      matches.length === 0
    ) {
      matchList.innerHTML = `
        <div class="empty-state">
          No fixtures yet.
          Add teams and generate fixtures.
        </div>
      `;

      return;
    }


    matches.forEach(
      match => {
        const card =
          document.createElement(
            "div"
          );


        card.className =
          `match-card ${
            match.status ===
            "played"
              ? "played"
              : ""
          }`;


        card.innerHTML = `
          <div class="match-team">
            ${escapeHtml(
              match.home_team_name
            )}
          </div>

          <input
            class="score-input"
            id="homeScore-${match.id}"
            type="number"
            min="0"
            max="99"
            value="${
              match.home_score ??
              ""
            }"
          >

          <div class="match-separator">
            –
          </div>

          <input
            class="score-input"
            id="awayScore-${match.id}"
            type="number"
            min="0"
            max="99"
            value="${
              match.away_score ??
              ""
            }"
          >

          <div class="match-team away">
            ${escapeHtml(
              match.away_team_name
            )}
          </div>

          <button
            class="save-score-button"
            data-score-match="${match.id}"
            type="button"
          >
            ${
              match.status ===
              "played"
                ? "Update"
                : "Save"
            }
          </button>
        `;


        matchList.appendChild(
          card
        );
      }
    );


    document
      .querySelectorAll(
        "[data-score-match]"
      )
      .forEach(
        button => {
          button.addEventListener(
            "click",
            async () => {
              await saveScore(
                Number(
                  button.dataset
                    .scoreMatch
                )
              );
            }
          );
        }
      );
  }


  async function saveScore(
    matchId
  ) {
    const homeInput =
      document.getElementById(
        `homeScore-${matchId}`
      );

    const awayInput =
      document.getElementById(
        `awayScore-${matchId}`
      );


    if (
      homeInput.value === "" ||
      awayInput.value === ""
    ) {
      showToast(
        "Enter both scores."
      );

      return;
    }


    try {
      await api(
        `/api/matches/${matchId}/score`,
        {
          method: "PUT",

          body:
            JSON.stringify({
              homeScore:
                Number(
                  homeInput.value
                ),

              awayScore:
                Number(
                  awayInput.value
                )
            })
        }
      );


      showToast(
        "Score saved. Standings updated."
      );


      await loadTournament();

    } catch (error) {
      showToast(
        error.message
      );
    }
  }


  function renderLeaderboard(
    leaderboard
  ) {
    leaderboardBody.innerHTML =
      "";


    if (
      leaderboard.length === 0
    ) {
      leaderboardBody.innerHTML = `
        <tr>
          <td
            colspan="8"
            class="empty-state"
          >
            Add teams to build the leaderboard.
          </td>
        </tr>
      `;

      return;
    }


    leaderboard.forEach(
      team => {
        const row =
          document.createElement(
            "tr"
          );


        row.innerHTML = `
          <td>
            <div class="position-number">
              ${team.position}
            </div>
          </td>

          <td class="team-name-cell">
            <strong>
              ${escapeHtml(
                team.name
              )}
            </strong>

            <span>
              ${escapeHtml(
                team.shortName
              )}
            </span>
          </td>

          <td>
            ${team.played}
          </td>

          <td>
            ${team.wins}
          </td>

          <td>
            ${team.draws}
          </td>

          <td>
            ${team.losses}
          </td>

          <td>
            ${
              team.goalDifference >
              0
                ? "+"
                : ""
            }${team.goalDifference}
          </td>

          <td class="points-cell">
            ${team.points}
          </td>
        `;


        leaderboardBody.appendChild(
          row
        );
      }
    );
  }


  function renderTeams(
    teams
  ) {
    teamList.innerHTML =
      "";


    if (
      teams.length === 0
    ) {
      teamList.innerHTML = `
        <div class="empty-state">
          No teams have been added.
        </div>
      `;

      return;
    }


    teams.forEach(
      team => {
        const item =
          document.createElement(
            "div"
          );


        item.className =
          "team-item";


        item.innerHTML = `
          <div>

            <div class="team-code">
              ${escapeHtml(
                team.short_name
              )}
            </div>

            <strong>
              ${escapeHtml(
                team.name
              )}
            </strong>

          </div>

          <span>
            Registered
          </span>
        `;


        teamList.appendChild(
          item
        );
      }
    );
  }


  function renderActivity(
    activity
  ) {
    activityList.innerHTML =
      "";


    if (
      activity.length === 0
    ) {
      activityList.innerHTML = `
        <div class="empty-state">
          No recent activity.
        </div>
      `;

      return;
    }


    activity.forEach(
      item => {
        const element =
          document.createElement(
            "div"
          );


        element.className =
          "activity-item";


        element.innerHTML = `
          <div class="activity-icon">
            ↗
          </div>

          <div>
            <strong>
              ${escapeHtml(
                item.action
              )}
            </strong>

            <span>
              ${escapeHtml(
                item.user_name
              )}
              ·
              ${formatDateTime(
                item.created_at
              )}
            </span>
          </div>
        `;


        activityList.appendChild(
          element
        );
      }
    );
  }


  function formatDateTime(
    value
  ) {
    const normalised =
      String(value).includes(
        "T"
      )
        ? value
        : value.replace(
            " ",
            "T"
          ) + "Z";


    return new Date(
      normalised
    ).toLocaleString(
      "en-GB",
      {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      }
    );
  }


  addTeamForm.addEventListener(
    "submit",
    async event => {
      event.preventDefault();


      if (
        !currentTournamentId
      ) {
        return;
      }


      try {
        await api(
          `/api/tournaments/${currentTournamentId}/teams`,
          {
            method: "POST",

            body:
              JSON.stringify({
                name:
                  teamNameInput.value,

                shortName:
                  teamShortInput.value
              })
          }
        );


        teamNameInput.value =
          "";

        teamShortInput.value =
          "";


        showToast(
          "Team added."
        );


        await loadTournament();

      } catch (error) {
        showToast(
          error.message
        );
      }
    }
  );


  generateFixturesButton.addEventListener(
    "click",
    async () => {
      if (
        !currentTournamentId
      ) {
        return;
      }


      try {
        const data =
          await api(
            `/api/tournaments/${currentTournamentId}/generate-fixtures`,
            {
              method: "POST",

              body:
                JSON.stringify({})
            }
          );


        showToast(
          data.added > 0
            ? `${data.added} fixture${data.added === 1 ? "" : "s"} generated.`
            : "All possible fixtures already exist."
        );


        await loadTournament();

      } catch (error) {
        showToast(
          error.message
        );
      }
    }
  );


  tournamentSelect.addEventListener(
    "change",
    async () => {
      currentTournamentId =
        Number(
          tournamentSelect.value
        );


      await loadTournament();
    }
  );


  newTournamentButton.addEventListener(
    "click",
    () => {
      tournamentModal.classList.remove(
        "hidden"
      );
    }
  );


  tournamentForm.addEventListener(
    "submit",
    async event => {
      event.preventDefault();


      try {
        const data =
          await api(
            "/api/tournaments",
            {
              method: "POST",

              body:
                JSON.stringify({
                  name:
                    document.getElementById(
                      "newTournamentName"
                    ).value,

                  sport:
                    document.getElementById(
                      "newTournamentSport"
                    ).value
                })
            }
          );


        tournamentModal.classList.add(
          "hidden"
        );


        tournamentForm.reset();


        showToast(
          "Tournament created."
        );


        await loadTournaments(
          data.tournamentId
        );

      } catch (error) {
        showToast(
          error.message
        );
      }
    }
  );


  logoutButton.addEventListener(
    "click",
    async () => {
      try {
        await api(
          "/api/auth/logout",
          {
            method: "POST",

            body:
              JSON.stringify({})
          }
        );

      } finally {
        window.location.href =
          "/";
      }
    }
  );


  document
    .querySelectorAll(
      "[data-close]"
    )
    .forEach(
      button => {
        button.addEventListener(
          "click",
          () => {
            document
              .getElementById(
                button.dataset.close
              )
              .classList.add(
                "hidden"
              );
          }
        );
      }
    );


  tournamentModal.addEventListener(
    "click",
    event => {
      if (
        event.target ===
        tournamentModal
      ) {
        tournamentModal.classList.add(
          "hidden"
        );
      }
    }
  );


  async function initialiseDashboard() {
    await loadUser();

    await loadTournaments();
  }


  initialiseDashboard();
}