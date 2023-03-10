const express = require("express");
const app = express();
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true })); //mongoDB 접속하기 위해 작성1
const MongoClient = require("mongodb").MongoClient; //mongoDB 접속하기 위해 작성2
app.set("view engin", "ejs"); //ejs 사용하기 위해 작성
const methodOverride = require("method-override"); //put과 delete 요청할 수 있는 라이브러리 method-override 쓰기 위해 작성
app.use(methodOverride("_method")); //put과 delete 요청할 수 있는 라이브러리 method-override 쓰기 위해 작성
const passport = require("passport"); //session방식 로그인 기능 구현하기 위한 라이브러리1
const LocalStrategy = require("passport-local").Strategy; //session방식 로그인 기능 구현하기 위한 라이브러리2
const session = require("express-session"); //session방식 로그인 기능 구현하기 위한 라이브러리3
require("dotenv").config(); //환경변수 사용을 위한 라이브러리
let multer = require("multer"); //파일전송한 것을 저장/분석 등 쉽게 하기 위한 라이브러리
const { ObjectId } = require("mongodb");
const http = require("http").createServer(app); //socket.io 셋팅
const { Server } = require("socket.io"); //socket.io 셋팅
const io = new Server(http); //socket.io 셋팅

var storage = multer.diskStorage({
  //업로드한 이미지를 어디로 보낼지 폴더 경로 정의하는 부분
  destination: function (req, file, cb) {
    cb(null, "./public/image");
  },
  filename: function (req, file, cb) {
    //저장한 이미지의 파일명 설정하는 부분
    cb(null, file.originalname); //originalname = 기존 파일 이름으로 저장, 추가로 '+ "날짜" + new Date()' 적을 수 있음
  },
  // filters: function (req, file, cb) {
  //   //파일 업로드 전 제재 걸 수 있음(파일 형식:확장자 거르기)
  //   var ext = path.extname(file.originalname);
  //   if (ext !== ".png" && ext !== ".jpg" && ext !== ".jpeg") {
  //     return callback(new Error("PNG, JPG만 업로드하세요"));
  //   }
  //   callback(null, true);
  // },
  // limits: {
  //   fileSize: 1024 * 1024, //파일 사이즈 제한
  // },
});

var upload = multer({ storage: storage }); //post 요청할 때 upload 소환해주면 됨(미들웨어)

//app.user(미들웨어) : 웹서버는 요청-응답해주는 머신이기때문에 중간에 실행되는 코드를 미들웨어라고 함
app.use(
  session({ secret: "비밀코드", resave: true, saveUninitialized: false })
);
app.use(passport.initialize());
app.use(passport.session());

app.use("/public", express.static("public")); //내가 작성한 css 파일 첨부하기 위해 작성

var db;
//mongoDB connect에서 복붙 (아이디,비밀번호,프로젝트이름 확인 필수:비번에 특수문자는 변환필요)
MongoClient.connect(
  //접속해주세요라고 요청하는 곳이고
  process.env.DB_URL,
  function (에러, client) {
    //연결되면 할 일
    if (에러) return console.log(에러);
    db = client.db("todoapp");

    // db.collection("post").insertOne(
    //   { 이름: "John", _id: 100 },
    //   function (에러, 결과) {
    //     console.log("저장완료");
    //   }
    // );

    http.listen(process.env.PORT, function () {
      //웹소켓 쓰기 위해서 app.listen을 http.listen으로 바꿈
      //사실 app로 적든 http로 적든 같은 기능이라 상관없음
      console.log("listening on 8080");
    });
  }
);

//서버로 get요청 처리
//누군가 /pet 으로 방문하면 pet 관련된 안내문을 띄워주자
// app.get("/pet", function (요청req, 응답res) {
//   응답res.send("펫용품 쇼핑 페이지임");
// });

// app.get("/beauty", function (요청req, 응답res) {
//   응답res.send("뷰티용품 쇼핑 페이지임");
// });

//html 파일 보내기
app.get("/", function (요청req, 응답res) {
  // 응답res.sendFile(__dirname + "/index.ejs"); html 파일 불러오기
  응답res.render("index.ejs"); //ejs 파일 랜더링하기
});

app.get("/write", function (요청req, 응답res) {
  // 응답res.sendFile(__dirname + "/write.ejs"); html 파일 불러오기
  응답res.render("write.ejs"); //ejs 파일 랜더링하기
});

//어떤사람이 /add경로로 POST 요청하면 send 해주세요
// app.post("/add", function (요청req, 응답res) {
//   응답res.send("전송완료");
//   console.log(요청req.body.title);
//   console.log(요청req.body.date);
// });

//어떤 사람이 /add 라는 경로로 post 요청하면
//데이터 2개(날짜,제목)를 보내주는데
//이때, 'post'라는 이름을 가진 collection에 데이터 두개를 저장하기
//{제목:'어쩌구', 날짜:'어쩌구'}
app.post("/add", function (요청req, 응답res) {
  // 요청req.user._id; //현재로그인한 사람의 정보 들어있음
  응답res.send("전송완료");
  // console.log(요청req.body.title);
  // console.log(요청req.body.date);
  db.collection("counter").findOne(
    { name: "게시물갯수" },
    function (에러, 결과) {
      console.log(결과.totalPost);
      var 총게시물갯수 = 결과.totalPost;
      var 저장할데이터 = {
        _id: 총게시물갯수 + 1,
        작성자: 요청req.user._id,
        제목: 요청req.body.title,
        날짜: 요청req.body.date,
      };

      db.collection("post").insertOne(
        저장할데이터, //원하는 데이터
        function () {
          console.log("저장완료");
          //counter라는 콜렉션에 있는 totalPost라는 항목도 1 증가시켜야함(수정)
          //db.collection('counter').updateOne({어떤데이터를 수정할지},{$연산자:{수정값}},function(){})
          db.collection("counter").updateOne(
            { name: "게시물갯수" },
            { $inc: { totalPost: 1 } },
            function (에러, 결과) {
              if (에러) {
                return console.log(에러);
              }
            }
          );
        }
      );
    }
  );
});

// /list로 GET요청으로 접속하면
// 실제 DB에 저장된 데이터들로 예쁘게 꾸며진 HTML을 보여줌
app.get("/list", function (요청, 응답) {
  // DB에 저장된 post라는 collection안의 모든(or ID가 뭐인, 제목이 뭐인) 데이터를 꺼내주세요
  db.collection("post")
    .find()
    .toArray(function (에러, 결과) {
      console.log(결과);
      응답.render("list.ejs", { posts: 결과 });
    }); //모든 데이터 가져옴
});

//서버에서 query string 꺼내는 법(1)
// app.get("/search", (요청, 응답) => {
//   console.log(요청.query.value); //query string이 담겨있음. value는 검색한 단어임
//   db.collection("post")
//     .find({ 제목: 요청.query.value })
//     .toArray((에러, 결과) => {
//       console.log(결과);
//       응답.render("search.ejs", { posts: 결과 });
//     });
// });

// 일부 일치하면 검색 가능하도록, '정규식(문자검사하는식)' 쓰면 되지만 임시방편임. find(/정규식/)은 시간이 오래걸리기도함
// 정규식 대신 'indexing' 을 사용. 미리 정렬(indexing)
// index : 기존 collection을 정렬해놓은 사본(mongoDB->Collections-indexes->CREATE INDEX)
// 미리 indexing(정렬)해두면 BD는 알아서 Binary Search 해줌

//서버에서 query string 꺼내는 법(2)
// app.get("/search", (요청, 응답) => {
//   // new Date();
//   db.collection("post")
//     .find({ $text: { $search: 요청.query.value } })
//     .toArray((에러, 결과) => {
//       console.log(결과);
//       응답.render("search.ejs", { posts: 결과 });
//     });
// });

//서버에서 query string 꺼내는 법(3)
app.get("/search", (요청, 응답) => {
  var 검색조건 = [
    {
      $search: {
        index: "titleSearch",
        text: {
          query: 요청.query.value,
          path: "제목", // 제목날짜 둘다 찾고 싶으면 ['제목', '날짜']
        },
      },
    },
    { $project: { 제목: 1, _id: 0, score: { $meta: "searchScore" } } }, //1은 가져오고, 0은 안가져온다는 뜻, score는 검색어와 얼마나 관련있는지 점수로 매김
    // { $sort: { _id: 1 } }, //id를 오름차순으로 정렬
    // { $limit: 10 }, //검색 갯수 제한걸기
  ];
  console.log(요청.query);
  db.collection("post")
    .aggregate(검색조건)
    .toArray((에러, 결과) => {
      console.log(결과);
      응답.render("search.ejs", { posts: 결과 });
    });
});

// /delete경로로 DELETE요청 처리하는 코드
app.delete("/delete", function (요청, 응답) {
  console.log(요청.body);
  요청.body._id = parseInt(요청.body._id); //문자로 변환된 것을 숫자로 변환시킴

  var 삭제할데이터 = { _id: 요청.body._id, 작성자: 요청.user._id }; //id와 작성자 둘 다 만족하는 게시물 찾아서 지워줌
  //요청.body에 담겨온 게시물번호를 가진 글을 db에서 찾아서 삭제해주세요
  db.collection("post").deleteOne(삭제할데이터, function (에러, 결과) {
    console.log("삭제완료"); //터미널창에 '삭제완료' 출력
    if (결과) {
      console.log(결과);
    }
    응답.status(200).send({ message: "성공했습니다" });
  });
});

// /detail/url파라미터 로 GET 요청하면 detail.ejs 보여줌
app.get("/detail/:id", function (요청, 응답) {
  db.collection("post").findOne(
    { _id: parseInt(요청.params.id) },
    function (에러, 결과) {
      console.log(결과);
      응답.render("detail.ejs", { data: 결과 });
    }
  );
});

//edit 페이지 만들기
app.get("/edit/:id", function (요청, 응답) {
  db.collection("post").findOne(
    { _id: parseInt(요청.params.id) },
    function (에러, 결과) {
      console.log(결과);
      응답.render("edit.ejs", { post: 결과 });
    }
  );
});

//서버로 PUT 요청 들어오면 게시물 수정 처리하기
app.put("/edit", function (요청, 응답) {
  //폼에 담긴 제목 데이터, 날짜 데이터를 가지고, db.collection에 업데이트함, parseInt(요청.body.id)=요청.body.input의 name이 id 인 것
  db.collection("post").updateOne(
    { _id: parseInt(요청.body.id) },
    { $set: { 제목: 요청.body.title, 날짜: 요청.body.date } },
    function (에러, 결과) {
      console.log("수정완료");
      응답.redirect("/list");
    }
  );
});

//로그인 페이지 접속
app.get("/login", function (요청, 응답) {
  응답.render("login.ejs");
});

//서버가 로그인 요청 시...
app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/fail",
  }),
  function (요청, 응답) {
    //로그인 성공 시 처리하는 코드
    응답.redirect("/");
  }
);

//마이페이지 만들기
app.get("/mypage", 로그인했니, function (요청, 응답) {
  console.log(요청.user);
  응답.render("mypage.ejs", { 사용자: 요청.user });
});

//mypage 접속 전 실행할 미들웨어
function 로그인했니(요청, 응답, next) {
  if (요청.user) {
    next();
  } else {
    응답.send("로그인 안했습니다.");
  }
}

passport.use(
  new LocalStrategy(
    {
      usernameField: "id",
      passwordField: "pw",
      session: true, //세션을 저장할 것인지
      passReqToCallback: false,
    },
    //아이디/비번 맞는 지 DB와 비교 검증하는 부분
    function (입력한아이디, 입력한비번, done) {
      console.log(입력한아이디, 입력한비번);
      db.collection("login").findOne(
        { id: 입력한아이디 },
        function (에러, 결과) {
          if (에러) return done(에러);
          //밑에부터 아주 중요
          //done은 3개의 파라미터를 가질 수 있음 : done(서버에러, 성공시 사용자 DB데이터, 에러메세지)
          if (!결과)
            return done(null, false, { message: "존재하지않는 아이디요" });
          if (입력한비번 == 결과.pw) {
            return done(null, 결과); //'결과'는 아이디 비번 검증 성공시 아래의 user에 들어감
          } else {
            return done(null, false, { message: "비번틀렸어요" });
          }
        }
      );
    }
  )
);

// 세션만들기, 로그인 성공->세션정보 만듦->마이페이지 방문시 세션검사
// user.id를 이용해서 세션을 저장시키는 코드(로그인 성공시 발동)
passport.serializeUser(function (user, done) {
  //검증 코드의 '결과'가 user에 저장돔
  done(null, user.id); //세션 데이터를 만들고 세션의 id 정보를 쿠키로 보냄
});

//로그인한 유저의 세션아이디를 바탕으로 개인정보를 DB에서 찾는 역할(마이페이지 접속시 발동)
passport.deserializeUser(function (아이디, done) {
  //위 코드의 user.id가 '아이디'와 동일
  //db에서 위에 있는 user.id로 유저를 찾은 뒤에 유저 정보를 중괄호 안에 넣음(user의 DB를 마이페이지에서 출력해주려고)
  db.collection("login").findOne({ id: 아이디 }, function (에러, 결과) {
    done(null, 결과);
  });
});

//회원가입 만들기
app.post("/register", function (요청, 응답) {
  db.collection("login").insertOne(
    { id: 요청.body.id, pw: 요청.body.pw },
    function (에러, 결과) {
      응답.redirect("/");
    }
  );
});

//route들 파일로 관리하기 예제
// app.get("/shop/shirts", function (요청, 응답) {
//   응답.send("셔츠 파는 페이지입니다.");
// });

// app.get("/shop/pants", function (요청, 응답) {
//   응답.send("바지 파는 페이지입니다.");
// });

//app.use(미들웨어) : 요청과 응답사이에 실행되는 코드
app.use("/shop", require("./routes/shop.js")); //shop.js파일을 여기에 첨부하겠음
app.use("/board/sub", require("./routes/board.js")); //board.js파일을 여기에 첨부하겠음

//upload로 접속시 페이지
app.get("/upload", function (요청, 응답) {
  응답.render("upload.ejs");
});

//업로드경로도 post 요청하면 upload함수 실행 후 응답(업로드한 이미지를 image폴더에 저장)
//upload.single('input의 name속성이름)
//파일을 여러개 업로드 하고 싶으면 upload.single 아니라 upload.array('name 이름', 받을 최대 갯수)
app.post("/upload", upload.single("profile"), function (요청, 응답) {
  응답.send("업로드완료");
});

//업로드한 이미지 보여주기
app.get("/image/:imageName", function (요청, 응답) {
  응답.sendFile(__dirname + "/public/image/" + 요청.params.imageName); //__dirname=현재파일경로(server.js)
});

//채팅 요청
app.post("/chatroom", 로그인했니, function (요청, 응답) {
  var 저장할거 = {
    title: "무슨무슨채팅방",
    member: [ObjectId(요청.body.채팅당한사람id), 요청.user._id],
    date: new Date(),
  };
  db.collection("chatroom")
    .insertOne(저장할거)
    .then((결과) => {
      //콜백함수 대신 .then 써도 됨
      응답.send("채팅걸기 성공");
    });
});

// /chat접속 시 chat.ejs 보여주기
app.get("/chat", 로그인했니, function (요청, 응답) {
  db.collection("chatroom")
    .find({ member: 요청.user._id })
    .toArray()
    .then((결과) => {
      응답.render("chat.ejs", { data: 결과 });
    });
});

//메세지 DB에 저장하기
app.post("/message", 로그인했니, function (요청, 응답) {
  var 저장할거 = {
    parent: 요청.body.parent,
    content: 요청.body.content,
    userid: 요청.user._id,
    date: new Date(),
  };
  db.collection("message")
    .insertOne(저장할거)
    .then((결과) => {
      // console.log("DB저장성공");
      응답.send(결과);
    });
  // .catch(() => {
  //   console.log("DB저장실패");
  // });
});

//서버와 유저간 실시간 소통채널 열기
//Server Sent Event: 서버->유저 일방적 통신가능
app.get("/message/:id", 로그인했니, function (요청, 응답) {
  //Header를 수정해주세요; 이제 get경로로 요청하면 실시간 채널 오픈됨
  //GET,POST는 HTTP요청이라고 부름, HTTP요청 시 몰래 전송되는 정보들도 있음(유저의언어,쿠키,브라우저정보 등등 이런정보는 header라는 공간에 담겨있음)
  //서버->유저로 전달되는 Header를 아래와 같이 바꾸면 실시간 채널 개설됨
  응답.writeHead(200, {
    Connection: "keep-alive",
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
  });

  db.collection("message")
    .find({ parent: 요청.params.id })
    .toArray()
    .then((결과) => {
      //일반 GET,POST 요청은 1회 요청시 1회 응답만 가능하지만, Header를 위와같이 수정하면 여러번 응답가능
      응답.write("event: test\n"); //유저에게 데이터전송은 event:보낼데이터이름\n
      응답.write("data: " + JSON.stringify(결과) + "\n\n"); //data:보낼데이터\n\n
    });

  //Change Stream 설정법(문법임)
  const pipeline = [{ $match: { "fullDocument.parent": 요청.params.id } }]; //collection 안의 원하는 document만 감시하고 싶으면 쿼리문 적으면 됨
  const collection = db.collection("message"); //collection 정하고,
  const changeStream = collection.watch(pipeline); //.watch() 함수 붙이면 실시간 감시해줌
  changeStream.on("change", (result) => {
    //해당 컬렉션에 변동 생기면 여기 코드 실행됨
    응답.write("event: test\n");
    응답.write("data: " + JSON.stringify([result.fullDocument]) + "\n\n");
  });
});

//WebSocket :양방향 통신가능
//웹소켓 쓰려면 socket.io 라이브러리 사용
// /socket접속하면 socket.ejs페이지 보여줌
app.get("/socket", function (요청, 응답) {
  응답.render("socket.ejs");
});

//웹소켓에 접속시 내부 코드 실행하도록 함
io.on("connection", function (socket) {
  console.log("유저접속됨");
  // console.log(socket.id); //유저 아이디 확인용

  //서버가 room1-send 이름의 메세지 받으면 실행할 코드
  socket.on("room1-send", function (data) {
    io.to("room1").emit("broadcast", data); //room1에만 broadcast해줌
  });

  //서버가 joinroom이름의 메세지 받으면 실행할 코드
  socket.on("joinroom", function (data) {
    socket.join("room1"); //채팅방 만들고, 입장시키기 위한 코드
  });

  //유저가 서버에게 'user-send'이름으로 메세지 보내면(서버가 수신하면), 내부 코드 실행하도록 함
  socket.on("user-send", function (data) {
    //data는 유저가 보낸 메세지
    console.log(data);
    //서버가 유저에게 메세지 전송하는 방법
    io.emit("broadcast", data); //io.emit()특징은 모든 유저에게 메세지 보내줌(접속자간 단체 채팅방에 유용)
    //단체 채팅이 아니라, 서버-유저 1명간 단독으로 소통하고싶을때엔
    // io.to(socket.id).emit("broadcast", data);
  });
});
