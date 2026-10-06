const path = require("path");

const express =
  require("express");

const session =
  require("express-session");

const bcrypt =
  require("bcryptjs");

const helmet =
  require("helmet");

const {
  rateLimit
} =
  require("express-rate-limit");

const {
  db,
  createStarterTournament,
  calculateLeaderboard
} =
  require("./database");


const app = express();

const PORT =
  process.env.PORT ||
  3000;


app.use(
  helmet({
    contentSecurityPolicy: false
  })
);


app.use(
  express.json()
);


app.use(
  express.urlencoded({
    extended: true
  })
);


app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      "scoreforge-development-secret-change-me",

    resave: false,

    saveUninitialized: false,

    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge:
        1000 *
        60 *
        60 *
        8
    }
  })
);


const authLimiter =
  rateLimit({
    windowMs:
      15 *
      60 *
      1000,

    limit: 50,

    standardHeaders: true,

    legacyHeaders: false
  });


function requireAuth(
  req,
  res,
  next
) {
  if (
    !req.session.user
  ) {
    return res.status(
      401
    ).json({
      error:
        "Authentication required."
    });
  }

  next();
}


function ownsTournament(
  tournamentId,
  userId
) {
  return db.prepare(`
    SELECT id
    FROM tournaments
    WHERE id = ?
      AND created_by = ?
  `).get(
    tournamentId,
    userId
  );
}


function addActivity(
  tournamentId,
  userId,
  action
) {
  db.prepare(`
    INSERT INTO activity_logs (
      tournament_id,
      user_id,
      action
    )
    VALUES (?, ?, ?)
  `).run(
    tournamentId,
    userId,
    action
  );
}


/* AUTH */

app.post(
  "/api/auth/register",
  authLimiter,
  async (req, res) => {
    try {
      const name =
        String(
          req.body.name || ""
        ).trim();

      const email =
        String(
          req.body.email || ""
        )
          .trim()
          .toLowerCase();

      const password =
        String(
          req.body.password || ""
        );


      if (
        name.length < 2
      ) {
        return res.status(
          400
        ).json({
          error:
            "Name must contain at least 2 characters."
        });
      }


      if (
        !email.includes("@")
      ) {
        return res.status(
          400
        ).json({
          error:
            "Enter a valid email address."
        });
      }


      if (
        password.length < 8
      ) {
        return res.status(
          400
        ).json({
          error:
            "Password must contain at least 8 characters."
        });
      }


      const existingUser =
        db.prepare(`
          SELECT id
          FROM users
          WHERE email = ?
        `).get(email);


      if (existingUser) {
        return res.status(
          409
        ).json({
          error:
            "An account already exists with this email."
        });
      }


      const passwordHash =
        await bcrypt.hash(
          password,
          12
        );


      const result =
        db.prepare(`
          INSERT INTO users (
            name,
            email,
            password_hash
          )
          VALUES (?, ?, ?)
        `).run(
          name,
          email,
          passwordHash
        );


      const userId =
        Number(
          result.lastInsertRowid
        );


      createStarterTournament(
        userId
      );


      req.session.user = {
        id: userId,
        name,
        email
      };


      res.status(
        201
      ).json({
        success: true,
        user:
          req.session.user
      });

    } catch (error) {
      console.error(error);

      res.status(
        500
      ).json({
        error:
          "Unable to create account."
      });
    }
  }
);


app.post(
  "/api/auth/login",
  authLimiter,
  async (req, res) => {
    try {
      const email =
        String(
          req.body.email || ""
        )
          .trim()
          .toLowerCase();

      const password =
        String(
          req.body.password || ""
        );


      const user =
        db.prepare(`
          SELECT *
          FROM users
          WHERE email = ?
        `).get(email);


      if (!user) {
        return res.status(
          401
        ).json({
          error:
            "Incorrect email or password."
        });
      }


      const passwordMatches =
        await bcrypt.compare(
          password,
          user.password_hash
        );


      if (
        !passwordMatches
      ) {
        return res.status(
          401
        ).json({
          error:
            "Incorrect email or password."
        });
      }


      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email
      };


      res.json({
        success: true,
        user:
          req.session.user
      });

    } catch (error) {
      console.error(error);

      res.status(
        500
      ).json({
        error:
          "Unable to log in."
      });
    }
  }
);


app.post(
  "/api/auth/logout",
  (req, res) => {
    req.session.destroy(
      error => {
        if (error) {
          return res.status(
            500
          ).json({
            error:
              "Unable to log out."
          });
        }


        res.clearCookie(
          "connect.sid"
        );

        res.json({
          success: true
        });
      }
    );
  }
);


app.get(
  "/api/auth/me",
  requireAuth,
  (req, res) => {
    res.json({
      user:
        req.session.user
    });
  }
);


/* TOURNAMENTS */

app.get(
  "/api/tournaments",
  requireAuth,
  (req, res) => {
    const tournaments =
      db.prepare(`
        SELECT
          t.*,

          (
            SELECT COUNT(*)
            FROM teams
            WHERE tournament_id = t.id
          ) AS team_count,

          (
            SELECT COUNT(*)
            FROM matches
            WHERE tournament_id = t.id
          ) AS match_count

        FROM tournaments t

        WHERE t.created_by = ?

        ORDER BY
          t.created_at DESC
      `).all(
        req.session.user.id
      );


    res.json({
      tournaments
    });
  }
);


app.post(
  "/api/tournaments",
  requireAuth,
  (req, res) => {
    const name =
      String(
        req.body.name || ""
      ).trim();

    const sport =
      String(
        req.body.sport || ""
      ).trim();


    if (
      name.length < 3
    ) {
      return res.status(
        400
      ).json({
        error:
          "Tournament name must contain at least 3 characters."
      });
    }


    if (
      sport.length < 2
    ) {
      return res.status(
        400
      ).json({
        error:
          "Enter a sport."
      });
    }


    const result =
      db.prepare(`
        INSERT INTO tournaments (
          name,
          sport,
          created_by
        )
        VALUES (?, ?, ?)
      `).run(
        name,
        sport,
        req.session.user.id
      );


    addActivity(
      result.lastInsertRowid,
      req.session.user.id,
      `Tournament created: ${name}`
    );


    res.status(
      201
    ).json({
      success: true,
      tournamentId:
        Number(
          result.lastInsertRowid
        )
    });
  }
);


app.get(
  "/api/tournaments/:id",
  requireAuth,
  (req, res) => {
    const tournamentId =
      Number(
        req.params.id
      );


    const tournament =
      db.prepare(`
        SELECT *
        FROM tournaments
        WHERE id = ?
          AND created_by = ?
      `).get(
        tournamentId,
        req.session.user.id
      );


    if (!tournament) {
      return res.status(
        404
      ).json({
        error:
          "Tournament not found."
      });
    }


    const teams =
      db.prepare(`
        SELECT *
        FROM teams
        WHERE tournament_id = ?
        ORDER BY name
      `).all(
        tournamentId
      );


    const matches =
      db.prepare(`
        SELECT
          m.*,

          home.name
            AS home_team_name,

          home.short_name
            AS home_short_name,

          away.name
            AS away_team_name,

          away.short_name
            AS away_short_name

        FROM matches m

        JOIN teams home
          ON home.id =
          m.home_team_id

        JOIN teams away
          ON away.id =
          m.away_team_id

        WHERE
          m.tournament_id = ?

        ORDER BY
          CASE
            WHEN m.status = 'scheduled'
            THEN 0
            ELSE 1
          END,

          m.id
      `).all(
        tournamentId
      );


    const activity =
      db.prepare(`
        SELECT
          a.*,
          u.name AS user_name

        FROM activity_logs a

        JOIN users u
          ON u.id =
          a.user_id

        WHERE
          a.tournament_id = ?

        ORDER BY
          a.id DESC

        LIMIT 12
      `).all(
        tournamentId
      );


    const leaderboard =
      calculateLeaderboard(
        tournamentId
      );


    res.json({
      tournament,
      teams,
      matches,
      activity,
      leaderboard
    });
  }
);


/* TEAMS */

app.post(
  "/api/tournaments/:id/teams",
  requireAuth,
  (req, res) => {
    const tournamentId =
      Number(
        req.params.id
      );


    if (
      !ownsTournament(
        tournamentId,
        req.session.user.id
      )
    ) {
      return res.status(
        404
      ).json({
        error:
          "Tournament not found."
      });
    }


    const name =
      String(
        req.body.name || ""
      ).trim();

    let shortName =
      String(
        req.body.shortName || ""
      )
        .trim()
        .toUpperCase();


    if (
      name.length < 2
    ) {
      return res.status(
        400
      ).json({
        error:
          "Team name must contain at least 2 characters."
      });
    }


    if (!shortName) {
      shortName =
        name
          .replace(
            /[^A-Za-z]/g,
            ""
          )
          .slice(
            0,
            3
          )
          .toUpperCase();
    }


    shortName =
      shortName.slice(
        0,
        4
      );


    try {
      const result =
        db.prepare(`
          INSERT INTO teams (
            tournament_id,
            name,
            short_name
          )
          VALUES (?, ?, ?)
        `).run(
          tournamentId,
          name,
          shortName
        );


      addActivity(
        tournamentId,
        req.session.user.id,
        `Team added: ${name}`
      );


      res.status(
        201
      ).json({
        success: true,
        teamId:
          Number(
            result.lastInsertRowid
          )
      });

    } catch (error) {
      if (
        String(
          error.message
        ).includes(
          "UNIQUE"
        )
      ) {
        return res.status(
          409
        ).json({
          error:
            "That team already exists in this tournament."
        });
      }


      console.error(error);

      res.status(
        500
      ).json({
        error:
          "Unable to add team."
      });
    }
  }
);


/* FIXTURES */

app.post(
  "/api/tournaments/:id/generate-fixtures",
  requireAuth,
  (req, res) => {
    const tournamentId =
      Number(
        req.params.id
      );


    if (
      !ownsTournament(
        tournamentId,
        req.session.user.id
      )
    ) {
      return res.status(
        404
      ).json({
        error:
          "Tournament not found."
      });
    }


    const teams =
      db.prepare(`
        SELECT *
        FROM teams
        WHERE tournament_id = ?
        ORDER BY id
      `).all(
        tournamentId
      );


    if (
      teams.length < 2
    ) {
      return res.status(
        400
      ).json({
        error:
          "Add at least 2 teams before generating fixtures."
      });
    }


    const existingMatches =
      db.prepare(`
        SELECT
          home_team_id,
          away_team_id
        FROM matches
        WHERE tournament_id = ?
      `).all(
        tournamentId
      );


    const matchKey =
      new Set();


    existingMatches.forEach(
      match => {
        const ids = [
          match.home_team_id,
          match.away_team_id
        ].sort(
          (a, b) =>
            a - b
        );

        matchKey.add(
          ids.join("-")
        );
      }
    );


    const insertMatch =
      db.prepare(`
        INSERT INTO matches (
          tournament_id,
          home_team_id,
          away_team_id
        )
        VALUES (?, ?, ?)
      `);


    let added = 0;


    const generate =
      db.transaction(() => {
        for (
          let i = 0;
          i < teams.length;
          i++
        ) {
          for (
            let j = i + 1;
            j < teams.length;
            j++
          ) {
            const key =
              [
                teams[i].id,
                teams[j].id
              ]
                .sort(
                  (a, b) =>
                    a - b
                )
                .join("-");


            if (
              matchKey.has(key)
            ) {
              continue;
            }


            insertMatch.run(
              tournamentId,
              teams[i].id,
              teams[j].id
            );

            added++;
          }
        }
      });


    generate();


    addActivity(
      tournamentId,
      req.session.user.id,
      `${added} fixture${added === 1 ? "" : "s"} generated`
    );


    res.json({
      success: true,
      added
    });
  }
);


/* SCORE ENTRY */

app.put(
  "/api/matches/:id/score",
  requireAuth,
  (req, res) => {
    const matchId =
      Number(
        req.params.id
      );


    const homeScore =
      Number(
        req.body.homeScore
      );

    const awayScore =
      Number(
        req.body.awayScore
      );


    if (
      !Number.isInteger(
        homeScore
      ) ||
      !Number.isInteger(
        awayScore
      )
    ) {
      return res.status(
        400
      ).json({
        error:
          "Scores must be whole numbers."
      });
    }


    if (
      homeScore < 0 ||
      awayScore < 0 ||
      homeScore > 99 ||
      awayScore > 99
    ) {
      return res.status(
        400
      ).json({
        error:
          "Scores must be between 0 and 99."
      });
    }


    const match =
      db.prepare(`
        SELECT
          m.*,
          t.created_by,

          home.name
            AS home_name,

          away.name
            AS away_name

        FROM matches m

        JOIN tournaments t
          ON t.id =
          m.tournament_id

        JOIN teams home
          ON home.id =
          m.home_team_id

        JOIN teams away
          ON away.id =
          m.away_team_id

        WHERE
          m.id = ?
      `).get(
        matchId
      );


    if (
      !match ||
      match.created_by !==
      req.session.user.id
    ) {
      return res.status(
        404
      ).json({
        error:
          "Match not found."
      });
    }


    db.prepare(`
      UPDATE matches

      SET
        home_score = ?,
        away_score = ?,
        status = 'played',
        played_at = CURRENT_TIMESTAMP

      WHERE id = ?
    `).run(
      homeScore,
      awayScore,
      matchId
    );


    addActivity(
      match.tournament_id,
      req.session.user.id,
      `Score updated: ${match.home_name} ${homeScore}–${awayScore} ${match.away_name}`
    );


    res.json({
      success: true
    });
  }
);


/* PROTECTED DASHBOARD */

app.get(
  "/dashboard",
  (req, res) => {
    if (
      !req.session.user
    ) {
      return res.redirect(
        "/"
      );
    }


    res.sendFile(
      path.join(
        __dirname,
        "public",
        "dashboard.html"
      )
    );
  }
);


app.get(
  "/dashboard.html",
  (req, res) => {
    if (
      !req.session.user
    ) {
      return res.redirect(
        "/"
      );
    }


    res.sendFile(
      path.join(
        __dirname,
        "public",
        "dashboard.html"
      )
    );
  }
);


app.use(
  express.static(
    path.join(
      __dirname,
      "public"
    )
  )
);


app.use(
  (req, res) => {
    res.status(
      404
    ).json({
      error:
        "Route not found."
    });
  }
);


app.listen(
  PORT,
  () => {
    console.log(
      `ScoreForge running at http://localhost:${PORT}`
    );
  }
);