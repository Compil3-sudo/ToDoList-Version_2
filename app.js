const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const dateModule = require(__dirname + "/date.js");
const lodash = require('lodash');

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Connect to mongoose -> mongoDB
mongoose.connect("mongodb://localhost:27017/todolistDB");

// Create Schema
const itemsSchema = {
  name: String
};

// Create model using that Schema
const Item = mongoose.model("Item", itemsSchema);

// Create items
const item1 = new Item({
  name: "Welcome to your ToDoList!"
});

const item2 = new Item({
  name: "Hit the + button to add a new item."
});

const item3 = new Item({
  name: "<-- Check this box to delete an item."
});

const defaultItems = [item1, item2, item3];

const listSchema = {
  name: String,
  items: [itemsSchema]
};

const List = mongoose.model("List", listSchema);

app.get("/", function (req, res) {

  const defaultTitle = "List";
  const listName = req.body.list;

  Item.find({}, function (err, foundItems) {

    if (foundItems.length === 0) {
      Item.insertMany(defaultItems, function (err) {
        if (err) {
          console.log(err);
        } else {
          console.log("Successfully saved default items");
        }
      });
      res.redirect("/");
    } else {
      res.render("home", { listTitle: defaultTitle, newListItems: foundItems });
    }
  });

});

app.post("/addItem", function (req, res) {

  const itemName = req.body.newItem;
  const listName = req.body.list;

  const dashboardList = req.body.dashboardList;

  const item = new Item({
    name: itemName
  });

  if (listName === "List") {
    item.save();
    res.redirect("/");
  } else if (dashboardList === "Dashboard") {
    List.findOne({ name: listName }, function (err, foundList) {
      foundList.items.push(item);
      foundList.save();
      res.redirect("/dashboard");
    });
  } else {
    List.findOne({ name: listName }, function (err, foundList) {
      foundList.items.push(item);
      foundList.save();
      res.redirect("/lists/" + listName);
    });
  }
});

app.post("/delete", (req, res) => {
  const checkedItemId = req.body.deleteCheckbox;
  const listDeleteName = req.body.listDeleteName;
  const dashboardList = req.body.dashboardList;

  if (listDeleteName === "List") {
    Item.findByIdAndRemove(checkedItemId, function (err) {
      if (err) {
        console.log(err);
      } else {
        console.log("Successfully deleted item: " + checkedItemId + " from list: " + listDeleteName);
      }
    });
    res.redirect("/");
  } else {
    List.findOneAndUpdate({ name: listDeleteName }, { $pull: { items: { _id: checkedItemId } } }, function (err, foundList) {
      if (err) {
        console.log(err);
      } else {
        console.log("Successfully deleted item: " + checkedItemId + " from list: " + listDeleteName);
        if (dashboardList === "Dashboard") {
          res.redirect("/dashboard");
        } else {
          res.redirect("/lists/" + listDeleteName);
        }
      }
    });
  }
});

app.get("/about", function (req, res) {
  res.render("about");
});

app.get("/dashboard", (req, res) => {

  List.find(function (err, foundLists) {
    if (!err) {
      if (foundLists.length === 0) {
        // Lists don't exits => do nothing for now
        console.log("Currently, no lists exist.");
        //res.redirect("/");
        res.render("dashboard", { listTitle: "No lists available.", allLists: [] });
      } else {
        // Show existing lists
        console.log("Trying to display all existing lists.");
        console.log(foundLists);
        res.render("dashboard", { listTitle: "Dashboard", allLists: foundLists })
      }
    }
  });

});

app.get("/view", (req, res) => {

  List.find(function (err, foundLists) {
    if (!err) {
      if (foundLists.length === 0) {
        // Lists don't exits => do nothing for now
        console.log("Currently, no lists exist.");
        //res.redirect("/");
        res.render("view", { listTitle: "No lists available.", allLists: [] });
      } else {
        // Show existing lists
        console.log("Trying to display all existing lists.");
        console.log(foundLists);
        res.render("view", { listTitle: "View", allLists: foundLists })
      }
    }
  });

});

app.post("/createList", function (req, res) {
  const inputTitle = req.body.newList;
  const createList = req.body.createList;

  if (typeof inputTitle === 'string' && inputTitle !== '' && inputTitle.trim() !== '') {
    let newList = lodash.capitalize(inputTitle);

    if (newList === "Day") {
      newList = dateModule.getDay();
    }

    List.findOne({ name: newList }, function (err, foundList) {
      if (!err) {
        if (!foundList) {
          // List doesn't exits => create a new one
          const list = new List({
            name: newList,
            items: []
          });
          list.save();

          if (createList === "View") {
            res.redirect("/view");
          } else {
            res.redirect("/lists/" + newList);
          }
        } else {
          // Show existing list
          console.log("List already exists");
          if (createList === "View") {
            res.redirect("/view");
          } else {
            res.redirect("/lists/" + foundList.name);
          }
        }
      }
    });
  } else {
    console.log("Invalid List Title");
    res.redirect("/");
  }
});

app.post("/deleteList", function (req, res) {
  const checkedListId = req.body.deleteCheckbox;
  const viewList = req.body.listDeleteName;

  console.log("ID to be deleted: " + checkedListId);

  List.findByIdAndDelete({ _id: checkedListId }, function (err, deletedList) {
    if (err) {
      console.log(err);
    } else {
      console.log("Succesfully deleted list: " + deletedList);
      if (viewList === "View") {
        res.redirect("/view");
      } else {
        res.redirect("/dashboard");
      }
    }
  });
});

app.get("/lists/:customListName", (req, res) => {
  const customListName = lodash.capitalize(req.params.customListName);

  List.findOne({ name: customListName }, function (err, foundList) {
    if (!err) {
      if (!foundList) {
        // List doesn't exits => create a new one
        const list = new List({
          name: customListName,
          items: []
        });
        list.save();
        res.redirect("/lists/" + customListName);
      } else {
        // Show existing list
        res.render("list", { listTitle: foundList.name, newListItems: foundList.items });
      }
    }
  });
});

app.listen(3000, function () {
  console.log("Server started on port 3000");
});
