const fs = require("fs");
const bodyParser = require("body-parser");
const jsonServer = require("json-server");
const jwt = require("jsonwebtoken");

const server = jsonServer.create();
const router = jsonServer.router("./db.json");
const middlewares = jsonServer.defaults();
const queryString = require("query-string");
const userdb = JSON.parse(fs.readFileSync("./db.json", "UTF-8"));

server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());
server.use(jsonServer.defaults());

const SECRET_KEY = "123456789";

const expiresIn = "100h";

// Create a token from a payload
function createToken(payload) {
  return jwt.sign(payload, SECRET_KEY, { expiresIn });
}

// Verify the token
function verifyToken(token) {
  return jwt.verify(token, SECRET_KEY, (err, decode) =>
    decode !== undefined ? decode : err
  );
}

// Check if the user exists in database
function isAuthenticated({ email, password }) {
  console.log(userdb.users);
  return (
    userdb.users.findIndex(
      (user) => user.email === email && user.password === password
    ) !== -1
  );
}

//Register New User
server.post("/api/auth/register", (req, res) => {
  console.log("register endpoint called; request body:");
  console.log(req.body);
  const { email, password } = req.body;

  if (isAuthenticated({ email, password }) === true) {
    const status = 401;
    const message = "Email and Password already exist";
    res.status(status).json({ status, message });
    return;
  }

  fs.readFile("./db.json", (err, data) => {
    if (err) {
      const status = 401;
      const message = err;
      res.status(status).json({ status, message });
      return;
    }

    // Get current users data
    var data = JSON.parse(data.toString());

    // Get the id of last user
    var last_item_id = data?.users[data.users.length - 1]?.id || 0;

    //Add new user
    data.users.push({ id: last_item_id + 1, email: email, password: password }); //add some data
    fs.writeFile("./db.json", JSON.stringify(data), (err, result) => {
      // WRITE
      if (err) {
        const status = 401;
        const message = err;
        res.status(status).json({ status, message });
        return;
      }
    });
  });

  //Create token for new user
  const access_token = createToken({ email, password });
  console.log("Access Token:" + access_token);
  res.status(200).json({ access_token });
});

// Login to one of the users from ./users.json
server.post("/api/auth/login", (req, res) => {
  console.log("login endpoint called; request body:");
  const { email, password } = req.body;
  console.log(isAuthenticated({ email, password }));
  if (isAuthenticated({ email, password }) === false) {
    const status = 401;
    const message = "Incorrect email or password";
    res.status(status).json({ status, message });
    return;
  }
  const access_token = createToken({ email, password });
  console.log("Access Token:" + access_token);
  res.status(200).json({ access_token });
});

// server.use(/^(?!\/auth).*$/, (req, res, next) => {
//   if (
//     req.headers.authorization === undefined ||
//     req.headers.authorization.split(" ")[0] !== "Bearer"
//   ) {
//     const status = 401;
//     const message = "Error in authorization format";
//     res.status(status).json({ status, message });
//     return;
//   }
//   try {
//     let verifyTokenResult;
//     verifyTokenResult = verifyToken(req.headers.authorization.split(" ")[1]);

//     if (verifyTokenResult instanceof Error) {
//       const status = 401;
//       const message = "Access token not provided";
//       res.status(status).json({ status, message });
//       return;
//     }
//     next();
//   } catch (err) {
//     const status = 401;
//     const message = "Error access_token is revoked";
//     res.status(status).json({ status, message });
//   }
// });

// server.use(router);

// server.listen(8000, () => {
//   console.log("Run Auth API Server");
// });

// Set default middlewares (logger, static, cors and no-cache)
server.use(middlewares);

// Add custom routes before JSON Server router
server.get("/echo", (req, res) => {
  res.jsonp(req.query);
});

// To handle POST, PUT and PATCH you need to use a body-parser
// You can use the one used by JSON Server
server.use(jsonServer.bodyParser);
server.use((req, res, next) => {
  if (req.method === "POST") {
    req.body.createdAt = Date.now();
    req.body.updatedAt = Date.now();
  }
  // Continue to JSON Server router
  next();
});

router.render = (req, res) => {
  const headers = res.getHeaders();
  const totalCountHeader = headers["x-total-count"];
  if (req.method === "GET" && totalCountHeader) {
    const queryParams = queryString.parse(req._parsedOriginalUrl.query);
    const results = {
      data: res.locals.data,
      pagination: {
        _page: Number.parseInt(queryParams._page) || 1,
        _limit: Number.parseInt(queryParams._limit) || 10,
        _totalRows: Number.parseInt(totalCountHeader),
      },
    };
    return res.jsonp(results);
  }
  return res.jsonp(res.locals.data);
};

// Use default router
server.use("/api", router);
server.listen(3333, () => {
  console.log("JSON Server is running");
});
