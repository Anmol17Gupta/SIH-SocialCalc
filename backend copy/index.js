
const express = require("express")
const cors = require("cors");
const rootRouter = require("./routes/index");

const app = express();

app.use(cors());
app.use(express.json());
app.get("/" , function(req,res) {
    res.send("hello");
})
app.use("/api/v1", rootRouter);

app.listen(3000);
