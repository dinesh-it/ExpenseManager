      var db;
      var query;
      var dtable;
      var share;
      var db_data = {};
      var file = {};

      // graph data 
      var ir_data = []; //data for item-wise report 
      var cr_data = []; // data for pie-chart report
      var _data = [];

      //default preferences
      var settings = {
          currency: "₹",
          date_format: "dmy"
      };
      var currency;
      var date_format;
      var default_paid_by = "";
      var default_paid_to = "Team";

      var team_members = [];
      var team_size;
      var nz_contribution = [];
      var contribution = {};

      //defined forEach 
      var forEach = function(a, c) {
          var l = a.length;
          for (var i = 0; i < l; i++) c(a[i], i)
      }


      document.addEventListener("deviceready", onDeviceReady, false);

      function onDeviceReady() {
          //create ExpenseDB version 1.0
          db = window.openDatabase("ExpenseDB", "1.0", "ExpenseDB", 200000);
          db.transaction(openTable, errorCB);

          //get fileSystem for import/export
          window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, gotFS, fail);

          // events listeners
          document.addEventListener("menubutton", onMenuKeyDown, false);
          $("#save").bind("click", saveData);
          $("#load").bind("click", viewTransactions);
          $("#export").bind("click", exportData);
          $("#import").bind("click", importData);
          $("#preferences").bind("click", configure);
          $("#clearall").bind("click", clearAll);
          $("#help").bind("click", showHelp);

          $("#btnDeleteRow").bind("click", deleteData);
          $("#btnEditRow").bind("click", updateData);
          $("#btnCancel").bind("click", cancelSelection);

          $("#pref-cancel").bind("click", prefCancelSelection);
          $("#pref-save").bind("click", savePreferences);



          //current menu list background
          var default_color = $('#import').css("background-color");
          var menu_ids = '#import,#export,#preferences,#clearall,#help,#about';

          $(menu_ids).bind('touchstart', function() {
              $(this).css('background-color', 'red');
          });

          $(menu_ids).bind('touchend', function() {
              $(this).css('background-color', default_color);
          });

          $("#records").on('change', function() {
              //total amount for new contents in the dataTable
              cal_total();
          });

          // date sort for 1st column
          jQuery.extend(jQuery.fn.dataTableExt.oSort, {
              "date-eu-pre": function(date) {
                  var eu_date = date.split('/');
                  var year = eu_date[2];
                  var month;
                  var day;
                  if (date_format == "dmy") {
                      day = eu_date[0];
                      month = eu_date[1];
                  } else {
                      day = eu_date[1];
                      month = eu_date[0];
                  }

                  if (month.length == 1) {
                      month = 0 + month;
                  }
                  if (day.length == 1) {
                      day = 0 + day;
                  }
                  return (year + month + day) * 1;
              },

              "date-eu-asc": function(a, b) {
                  return ((a < b) ? -1 : ((a > b) ? 1 : 0));
              },

              "date-eu-desc": function(a, b) {
                  return ((a < b) ? 1 : ((a > b) ? -1 : 0));
              }
          });

          dtable = $('#records').dataTable({
              "aaSorting": [
                  [1, 'desc']
              ],

              "aoColumnDefs": [{
                  "bVisible": false,
                  "aTargets": [0]
              }],
              "fnDrawCallback": function(oSettings) {
                  cal_total();
              },
              "bAutoWidth": false,
              "sDom": 'lf<"options">ti<"total">p',
              'iDisplayLength': 100,
              "aoColumns": [
                  null, {
                      sType: "date-eu"
                  },
                  null,
                  null, {
                      sType: "numeric"
                  },
              ]
          });

          // dataTable Delete button
          //  $(".options").html('<button disabled="" id="btnDeleteRow">Delete</button>');
          //  $("#btnDeleteRow").bind("click", deleteData);

          // dataTable row select handler
          $("#records tbody").click(function(event) {
              var oDeleteRowButton = $("#btnDeleteRow");
              if ($(event.target.parentNode).hasClass("row_selected")) {
                  $(event.target.parentNode).removeClass("row_selected");
                  oDeleteRowButton.attr("disabled", "true");
                  $("#del").popup("close");
              } else {
                  $(dtable.fnSettings().aoData).each(function() {
                      $(this.nTr).removeClass("row_selected");
                  });
                  $(event.target.parentNode).addClass("row_selected");
                  oDeleteRowButton.removeAttr("disabled");

                  var d = getDateObject($(event.target.parentNode).find('td:eq(0)').html());
                  $("#e-date").datepicker("setDate", d);
                  if (typeof $(event.target.parentNode).find('td:eq(1)').html() != "undefined") {
                      var name = $(event.target.parentNode).find('td:eq(1)').html().split("-&gt;");
                      $("#e-paidby").val(name[0]);
                      $("#e-paidto").val(name[1]);
                      $("#e-paidfor").val($(event.target.parentNode).find('td:eq(2)').html());
                      $("#e-amount").val($(event.target.parentNode).find('td:eq(3)').html());
                      $("#del").popup("open");
                  }
              }
          });

          $("#paidby,#paidto,#paidfor").autocomplete({
              minLength: 0,
              source: []
          });


          // viewTransactions();
          var prevSelection = "tab1";
          //tab1 landing page
          $(document).on("click", "#navbar ul li", function() {
              var newSelection = $(this).children("a").attr("data-tab-class");
              $("." + prevSelection).addClass("ui-screen-hidden");
              $("." + newSelection).removeClass("ui-screen-hidden");
              if (newSelection == "tab2") {
                  //tab 2 bar graph
                  $("#item-report").html("");
                  showBarGraph();
              }
              if (newSelection == "tab3") {
                  //tab 3 pie-chart
                  $("#user-report").html("");
                  showPieGraph();
              }

              prevSelection = newSelection;
              //now prevSelection has curret active tab
          });
          setTimeout(function() {
              //hide splashscreen after 2 seconds, assuming page ready
              navigator.splashscreen.hide();
          }, 2000);

          $("#paidby,#paidfor,#paidto").on("focus", function(event) {
              $(this).autocomplete("search");
          });
          $("#paidby,#paidfor,#paidto").on("focusout", function(event) {
              $(this).autocomplete("close");
          });

          //swipe event 
          $(document).on("swipeleft", ".tab-content", function(event) {
              //TEMPORARY SOLUTION
              // jquerymobile swipe does not generate focusout event ,so hided here
              $("#paidby,#paidfor,#paidto").autocomplete("close");
              $("#date,#e-date,#from,#to").datepicker("hide");

              // to get active tab , not required right now
              //var current_tab = $("#navbar ul").find(".ui-btn-active").attr("data-tab-class");
              if (prevSelection == "tab1") {
                  $("." + prevSelection).addClass("ui-screen-hidden");
                  $(".tab2").removeClass("ui-screen-hidden");
                  $("#tx_tab").removeClass("ui-btn-active");
                  $("#report1_tab").addClass("ui-btn-active");
                  prevSelection = "tab2";
                  $("#item-report").html("");
                  showBarGraph();
              } else if (prevSelection == "tab2") {
                  $("." + prevSelection).addClass("ui-screen-hidden");
                  $(".tab3").removeClass("ui-screen-hidden");
                  $("#report1_tab").removeClass("ui-btn-active");
                  $("#report2_tab").addClass("ui-btn-active");
                  prevSelection = "tab3";
                  $("#user-report").html("");
                  showPieGraph();
              } else {
                  //no more left
                  $("." + prevSelection).addClass("ui-screen-hidden");
                  $(".tab1").removeClass("ui-screen-hidden");
                  $("#report2_tab").removeClass("ui-btn-active");
                  $("#tx_tab").addClass("ui-btn-active");
                  prevSelection = "tab1";
              }
          });

          $(document).on("swiperight", ".tab-content", function(event) {
              //TEMPORARY SOLUTION
              // jquerymobile swipe does not generate focusout event ,so hided here
              $("#paidby,#paidfor,#paidto").autocomplete("close");
              $("#date,#e-date,#from,#to").datepicker("hide");
              if (prevSelection == "tab3") {
                  $("." + prevSelection).addClass("ui-screen-hidden");
                  $(".tab2").removeClass("ui-screen-hidden");
                  $("#report2_tab").removeClass("ui-btn-active");
                  $("#report1_tab").addClass("ui-btn-active");
                  prevSelection = "tab2";
                  $("#item-report").html("");
                  showBarGraph();
              } else if (prevSelection == "tab2") {
                  $("." + prevSelection).addClass("ui-screen-hidden");
                  $(".tab1").removeClass("ui-screen-hidden");
                  $("#report1_tab").removeClass("ui-btn-active");
                  $("#tx_tab").addClass("ui-btn-active");
                  prevSelection = "tab1";
              } else {
                  //no more right
                  $("#menupanel").panel("open");
              }
          });
      }

      function cal_total() {
          // calculate total for amount column
          var total = 0;
          $("#records tr td:nth-child(4)").each(function(index, element) {
              total += parseInt($(element).text());
          });
          //append total to the dataTable
          $(".total").html('<span  style="font-size:0.80em;"><strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Total : </strong>' + total.toFixed(2) + '</span>');
      }

      // save new transaction
      function saveData(id) {
          var date, paidby, paidfor, paidto, amount;

          if (_.isObject(id)) {
              date = $("#date").datepicker("getDate").getTime();
              paidby = $("#paidby").val();
              paidfor = $("#paidfor").val();
              paidto = $("#paidto").val();
              amount = parseFloat($("#amount").val());
              amount = amount.toFixed(2);
          } else {
              date = $("#e-date").datepicker("getDate").getTime();
              paidby = $("#e-paidby").val();
              paidfor = $("#e-paidfor").val();
              paidto = $("#e-paidto").val();
              amount = parseFloat($("#e-amount").val());
              amount = amount.toFixed(2);
          }


          if (paidby == "" || paidfor == "" || amount == "" || paidto == "") {
              toast.show("All fields are required !", 1);
              return;
          } else if (!_.isFinite(amount)) {
              toast.show("Amount field is invalid !", 1);
              return;
          } else {
              //make init cap for names and reason
              paidfor = paidfor.toLowerCase();
              paidfor = paidfor[0].toUpperCase() + paidfor.slice(1);
              paidby = paidby.toLowerCase();
              paidby = paidby[0].toUpperCase() + paidby.slice(1);
              paidto = paidto.toLowerCase();
              paidto = paidto[0].toUpperCase() + paidto.slice(1);

              if (paidto == "Team") {
                  paidto = "All";
              }

              if (_.isObject(id)) {
                  //insert
                  query = "insert into Expense (Date,PaidBy,PaidTo,PaidFor,Amount) values (" + date + ",'" + paidby + "','" + paidto + "','" + paidfor + "'," + amount + ");";
              } else {
                  //update
                  query = "update Expense set Date = " + date + ",PaidBy='" + paidby + "',PaidTo='" + paidto + "',PaidFor='" + paidfor + "',Amount=" + amount + " where id = " + id + ";";
              }

              if (_.indexOf(team_members, paidto) == -1 && paidto != "All" && _.isObject(id)) {
                  // amount paid to new person , may be new team_member
                  navigator.notification.confirm(
                      'You are about to add new team member ?',
                      newMemberConfirm,
                      'New member ?',
                      'Add,NotNow,Cancel'
                  );
                  return;
              }
              db.transaction(insertRecord, errorCB, insertSuccess);
          }
      }

      function newMemberConfirm(buttonIndex) {
          if (buttonIndex == 1) {
              db.transaction(insertRecord, errorCB, insertSuccess);
              db.transaction(insertNew, errorCB);
          }
          if (buttonIndex == 2) {
              db.transaction(insertRecord, errorCB, insertSuccess);
          }
      }


      function insertRecord(tx) {
          tx.executeSql(query);
      }


      function insertSuccess(tx) {
          toast.show("Record Saved Successfully !", 1);
          viewTransactions();
      }

      function insertNew(tx) {
          //add new member with transaction for zero
          var date = new Date($("#date").val());
          date = date.getTime();
          var paidby = $("#paidto").val();
          tx.executeSql("insert into Expense (Date,PaidBy,PaidFor,Amount) values (" + date + ",'" + paidby + "','nothing',0);");
      }

      function updateData() {
          var id = $('table tr.row_selected').attr("id");
          saveData(id);
          cancelSelection();
      }

      function cancelSelection() {
          $("#del").popup("close");
          $(dtable.fnSettings().aoData).each(function() {
              $(this.nTr).removeClass("row_selected");
          });

      }

      function prefCancelSelection() {
          $("#pref").popup("close");
      }

      function savePreferences() {
          //update
          var d_currency = $("#d-currency").val();
          var d_paidto = $("#d-paidto").val();
          var d_paidby = $("#d-paidby").val();
          var dateformat = $("#dateformat").val();
          if (d_currency == "") {
              toast.show("Default currency required !", 0);
              return;
          }
          var pref = d_currency + "|" + dateformat;
          query = "update Expense set PaidBy='" + d_paidby + "',PaidTo='" + d_paidto + "',PaidFor='" + pref + "' where id = 0;";
          db.transaction(updateSettings, errorCB, setSuccess);
      }

      function updateSettings(tx) {
          tx.executeSql(query);
      }

      function setSuccess() {
          toast.show("Settings Saved Successfully !", 1);
          prefCancelSelection();
          db.transaction(openTable, errorCB);
      }


      function deleteData() {
          //delete row from dataTable 
          var id = $('table tr.row_selected').attr("id");
          if (id > 0) {
              query = "delete from Expense where id=" + id + ";";
              db.transaction(deleteRecord, errorCB);
          }
          cancelSelection();
      }

      function onMenuKeyDown() {
          //show menu
          $("#impPopup").popup("close");
          $("#cPopup").popup("close");
          $("#pref").popup("close");
          $("#date,#e-date,#from,#to").datepicker("hide");
          $("#del").popup("close");
          if ($(".ui-panel").hasClass("ui-panel-open") == true) {
              $("#menupanel").panel("close");
          } else {
              $("#menupanel").panel("open");
          }
      }

      function deleteConfirm(index) {
          //delete after confirmation
          if (index == 1) {
              db.transaction(deleteAllRecord, errorCB);
          }
      }

      function deleteAllRecord(tx) {
          tx.executeSql('delete from Expense where id != 0');
          viewTransactions();
          toast.show("All Record Deleted Successfully !", 1);
      }


      function deleteRecord(tx) {
          tx.executeSql(query);
          viewTransactions();
          toast.show("Record Deleted Successfully !", 1);
      }

      //create table Expense
      function openTable(tx) {
          tx.executeSql('CREATE TABLE IF NOT EXISTS Expense (id INTEGER PRIMARY KEY AUTOINCREMENT,Date Number NOT NULL, PaidBy TEXT NOT NULL, PaidFor TEXT NOT NULL,PaidTo TEXT NOT NULL DEFAULT "All",Amount Number NOT NULL)');
          var stmt = 'SELECT * from Expense where id = 0';
          tx.executeSql(stmt, [], selectSuccess);
      }


      function selectSuccess(tx, result) {
              var record = result.rows.length;
              if (record != 1) {
                  var pref = settings.currency + "|" + settings.date_format;
                  default_paid_by = '';
                  query = "INSERT INTO Expense VALUES(0,0,'" + default_paid_by + "','" + pref + "','" + default_paid_to + "',0)";
                  tx.executeSql(query);
                  var stmt = 'SELECT * from Expense where id = 0';
                  tx.executeSql(stmt, [], selectSuccess);
              } else {
                  var row = result.rows.item(0);
                  default_paid_by = row.PaidBy;
                  default_paid_to = row.PaidTo;
                  settings = row.PaidFor;
                  var set = settings.split("|");
                  if (set.length == 2) {
                      currency = set[0];
                      date_format = set[1];
                  } else {
                      //defaults
                      currency = "₹";
                      date_format = "mdy";
                  }
                  $("#paidby").val(default_paid_by);
                  $("#paidto").val(default_paid_to);
                  $("#currency").html("\(" + currency + "\)");
                  var df = "dd/mm/yy";
                  if (date_format == "mdy") {
                      df = "mm/dd/yy";
                  }
                  $("#date,#from,#to,#e-date").datepicker("destroy");
                  $("#date,#from,#to,#e-date").datepicker({
                      dateFormat: df
                  });
                  $("#date,#from,#to,#e-date").datepicker("refresh");

                  var date = new Date();
                  var firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
                  var lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

                  $("#date").datepicker("setDate", date);
                  $("#from").datepicker("setDate", firstDay);
                  $("#to").datepicker("setDate", lastDay);

                  viewTransactions();
              }
          }
          //function will be called when DB error occurred
      function errorCB(err) {
          toast.show("Error in Data !", 1);
      }

      function viewTransactions() {
          var from_epoch = $("#from").datepicker("getDate").getTime();
          var to_epoch = $("#to").datepicker("getDate").getTime();
          if (from_epoch >= to_epoch) {
              toast.show("Error : Check from date and to date ", 1);
              return;
          }
          query = 'SELECT * FROM Expense where Date between ' + from_epoch + ' and ' + to_epoch + ' and id != 0;';
          db.transaction(queryDB, errorCB);
      }

      function exportData() {
          $("#menupanel").panel("close");
          toast.show("Exporting ..", 0);
          db.transaction(reteriveAll, errorCB);
      }

      function reteriveAll(tx) {
          tx.executeSql('select * from Expense where id != 0;', [], exportResult, errorCB);
      }

      function exportResult(tx, result) {
          var no_of_records = result.rows.length;
          csv_data = '"Date","PaidBy","PaidFor","PaidTo","Amount"\n';
          for (var i = 0; i < no_of_records; i++) {
              var date_epoch = result.rows.item(i).Date;
              var date = getDateString(date_epoch);
              var paidby = result.rows.item(i).PaidBy;
              var paidfor = result.rows.item(i).PaidFor;
              var paidto = result.rows.item(i).PaidTo;
              var amount = result.rows.item(i).Amount;
              csv_data = csv_data + '"' + date + '","' + paidby + '","' + paidfor + '","' + paidto + '","' + amount + '"\n';
          }
          file.fs.root.getFile("ExpenseBackup.csv", {
              create: true,
              exclusive: false
          }, gotFileEntry, fail);
          file.writer.write(csv_data);
          toast.show("File backuped to " + file.fileobj.fullPath, 1);
      }

      function importData() {
          $("#menupanel").panel("close");
          $("#impPopup").popup("open");
          $("#import_button").bind("click", startImport);
          $("#file1").bind("change", FileChanged);
      }

      function clearAll() {
          $("#menupanel").panel("close");
          navigator.notification.confirm(
              'You are about to Delete all transactions! ',
              deleteConfirm,
              'Delete ?',
              'Yes,No'
          );
      }

      function configure() {
          $("#menupanel").panel("close");
          $("#dateformat").val(date_format);
          $('#dateformat').selectmenu('refresh');
          $("#d-paidby").val(default_paid_by);
          $("#d-paidto").val(default_paid_to);
          $("#d-currency").val(currency);
          $("#pref").popup("open");
      }

      function showHelp() {
          $("#menupanel").panel("close");
          toast.show("Connecting to network.... ", 0);
          toast.show("Connecting to network.... ", 0);
          window.open('https://github.com/Virendrabaskar/ExpenseManager/wiki/Help', '_blank', 'location=yes');
      }

      function FileChanged() {
          var fobj = document.getElementById('file1').files[0];
          if (typeof fobj != "undefined") {
              //extract extension from file name
              var ext = fobj.name.match(/\.[a-z]{3,3}$/gi);
              if (ext == null || ext[ext.length - 1].toLowerCase() != ".csv") {
                  toast.show("CSV File Required", 1);
                  $("#filename").html("No file chosen");
                  $("#file1").val("");
                  $("#import_button").addClass('ui-disabled');
                  return;
              }
              $("#filename").html(fobj.name);
              $("#import_button").removeClass('ui-disabled');
          } else {
              $("#filename").html("No file chosen");
              $("#import_button").addClass('ui-disabled');
          }
      }

      function startImport() {
          toast.show("Importing .. !", 0);
          var fobj = document.getElementById('file1').files[0];
          if (fobj) {
              var reader = new FileReader();
              var raw_data;
              reader.onloadend = function(evt) {
                  raw_data = evt.target.result;
                  //import mechanism
                  var contents = raw_data.split("\n");
                  db_data = {};
                  for (var i = 1; i < contents.length; i++) {
                      if (!contents[i] || contents[i] == "") {
                          continue;
                      }
                      contents[i] = contents[i].slice(1);
                      contents[i] = contents[i].slice(0, (contents[i].length - 1));
                      var line = contents[i].split(/","/);

                      if (line.length == 4 || line.length == 5) {
                          var date_string = line[0].split('/');
                          if (date_string.length == 3) {
                              var date = getDateEpoch(line[0]);
                              var paidby = line[1];
                              paidby = paidby.toLowerCase();
                              paidby = paidby[0].toUpperCase() + paidby.slice(1);
                              var paidfor = line[2];
                              var paidto = line[3];
                              paidto = paidto.toLowerCase();
                              paidto = paidto[0].toUpperCase() + paidto.slice(1);
                              paidfor = paidfor.toLowerCase();
                              paidfor = paidfor[0].toUpperCase() + paidfor.slice(1);

                              var amount = line[4];
                              amount = parseFloat(amount).toFixed(2);

                              db_data[i] = "insert into Expense (Date,PaidBy,PaidFor,PaidTo,Amount) values (" + date + ",'" + paidby + "','" + paidfor + "','" + paidto + "'," + amount + ");";
                          } else {
                              toast.show("Error in line : " + i, 1);
                              return;
                          }
                      } else {
                          toast.show("Error in line : " + i, 1);
                          return;
                      }
                  }
                  db.transaction(importALL, importFail, importSuccess);
              };
              reader.readAsText(fobj);
          } else {
              toast.show("CSV file required ! ", 1);
          }

      }

      function importALL(tx) {
          for (var i = 1; i <= Object.keys(db_data).length; i++) {
              tx.executeSql(db_data[i]);
          }
      }

      function importSuccess(tx) {
          viewTransactions();
          toast.show("Imported Successfully !", 1);
          $("#impPopup").popup("close");
      }

      function importFail(tx) {
          toast.show("Import Failure. Error in data (Check DateFormat) !", 1);
      }

      function queryDB(tx) {
          tx.executeSql(query, [], querySuccess, errorCB);
      }

      function querySuccess(tx, result) {
          //push all db records to _data
          _data = [];
          for (var i = 0; i < result.rows.length; i++) {
              _data.push(result.rows.item(i));
          }
          if (_.size(_data) > 0) {
              populateDataPane();
          } else {
              dtable.fnClearTable();
              ir_data = [];
              cr_data = [];
              $("#details").html("");
              $('#details').listview('refresh');
          }
      }

      function populateDataPane() {
          var paid_to_team = _.where(_data, {
              "PaidTo": "All"
          });
          team_members = _.uniq(_.pluck(paid_to_team, "PaidBy"));
          all_members = _.without(_.union(team_members, _.uniq(_.pluck(_data, "PaidTo"))), "All");
          all_paid_for = _.uniq(_.pluck(_data, "PaidFor"));
          team_size = _.size(team_members);

          //set Auto Complete
          $("#paidby").autocomplete({
              minLength: 0,
              source: team_members
          });
          var pt;
          if (_.size(all_members) > 0) {
              pt = _.union(all_members, ["Team"]);
          } else {
              pt = ["Team"];
          }
          $("#paidto").autocomplete({
              minLength: 0,
              source: pt
          });

          $("#paidfor").autocomplete({
              minLength: 0,
              source: all_paid_for
          });

          contribution = {
              Team: [],
              Members: []
          };

          var form_member_contribution = function(name) {
              var str = name;
              var size = all_members.length;
              for (var i = 0; i < size; i++) {
                  mem = all_members[i];
                  var ft = str + "->" + mem;
                  contribution.Members[ft] = 0;
              }
          };
          forEach(all_members, form_member_contribution);

          var form_team_contribution = function(name) {
              var ft = name + "->Team";
              contribution.Team[ft] = 0;
          };
          forEach(team_members, form_team_contribution);

          dtable.fnClearTable();
          ir_data = [];
          cr_data = [];
          var _ir_data = {};
          var _cr_data = {};


          var populate = function(row) {
              var date_epoch = row.Date;
              var date = getDateString(date_epoch);

              var paidto;
              if (row.PaidTo == "All") {
                  paidto = "Team";
              } else {
                  paidto = row.PaidTo;
              }

              var ft = row.PaidBy + "->" + paidto;

              // populate DataTable
              var addId = dtable.fnAddData([row.id, date, ft, row.PaidFor, row.Amount], false);
              var theNode = dtable.fnSettings().aoData[addId[0]].nTr;
              theNode.setAttribute('id', row.id);

              if (paidto == "Team") {
                  contribution.Team[ft] += row.Amount;
              } else {
                  contribution.Members[ft] += row.Amount;
              }

              //Graph Data 
              if (_.isUndefined(_ir_data[row.PaidFor])) {
                  _ir_data[row.PaidFor] = 0;
              }
              _ir_data[row.PaidFor] += row.Amount;

              if (_.isUndefined(_cr_data[row.PaidBy])) {
                  _cr_data[row.PaidBy] = 0;
              }
              _cr_data[row.PaidBy] += row.Amount;

          };
          forEach(_data, populate);

          setYadcf();
          dtable.fnDraw();
          cal_total();

          //Graph Data  


          ir_data = _.pairs(_.invert(_ir_data));

          _.map(_cr_data, function(value, key) {
              var x = key + " ( " + value + " " + currency + " )";
              cr_data.push([x, value]);
          });

          var fix_contribution = function(key) {
              var name = key.split('->');
              var ft = key;
              var tf = name[1] + "->" + name[0];
              if (ft != tf) {
                  if (contribution.Members[ft] > contribution.Members[tf]) {
                      contribution.Members[ft] = contribution.Members[ft] - contribution.Members[tf];
                      contribution.Members[tf] = 0;
                  } else if (contribution.Members[ft] < contribution.Members[tf]) {
                      contribution.Members[tf] = contribution.Members[tf] - contribution.Members[ft];
                      contribution.Members[ft] = 0;
                  } else {
                      contribution.Members[ft] = 0;
                      contribution.Members[tf] = 0;
                  }
              }
          };
          forEach(_.keys(contribution.Members), fix_contribution);

          nz_contribution = [];
          var find_nz_contribution = function(key) {
              if (contribution.Members[key] != 0) {
                  nz_contribution[key] = contribution.Members[key];
              }
          };
          forEach(_.keys(contribution.Members), find_nz_contribution);

          $("#details").html("");

          var total_amount = 0;
          var printTeamContribution = function(key) {
              var name = key.split('->');
              total_amount += contribution.Team[key];
              $("#details").append('<li><b>' + name[0] + '</b> has spent to team ' + contribution.Team[key] + ' ' + currency + '</li>');
          };
          forEach(_.keys(contribution.Team), printTeamContribution);

          var printMemberContribution = function(key) {
              var name = key.split('->');
              var pb_name = name[0];
              var pt_name = name[1];
              if (pb_name == pt_name) {
                  $("#details").append('<li><b>' + pb_name + '</b> has spent ' + nz_contribution[key] + ' ' + currency + ' for himself </li>');
              } else {
                  $("#details").append('<li><b>' + pt_name + '</b> need to give ' + nz_contribution[key] + ' ' + currency + ' to ' + pb_name + '</li>');
              }
          };
          forEach(_.keys(nz_contribution), printMemberContribution);

          if (total_amount != 0) {
              $("#details").append('<li><b>Total amount spent to team </b> = ' + total_amount.toFixed(2) + ' ' + currency + '</li>');
              share = total_amount / team_size;
              if (team_size > 1) {
                  $("#details").append('<li><b>Individual share</b> = ' + share.toFixed(2) + ' ' + currency + '</li>');
              }
          }

          if (team_size > 1) {
              $("#details").append('<li><center><input id="calc" type="button" value="Calculate teampay"></input><input id="savereport" type="button" value="Save report"></input></center></li>');
              var input = document.getElementById("teampay");
              input.addEventListener("keyup", calcCommonExpense);
              var calc_button = document.getElementById("calc");
              calc_button.addEventListener("click", call_calc_popup);
          } else {
              $("#details").append('<li><center><input id="savereport" type="button" value="Save report"></input></center></li>');
          }

          var download_button = document.getElementById("savereport");
          download_button.addEventListener("click", saveReport);

          $('#details').listview('refresh');
      }

      function setYadcf() {
          dtable.yadcf([{
              column_number: 1,
              filter_container_id: 'date_container',
              filter_default_label: 'All'
          }, {
              column_number: 2,
              filter_container_id: 'paidby_container',
              filter_default_label: 'All'
          }, {
              column_number: 3,
              filter_container_id: 'paidfor_container',
              filter_default_label: 'All'
          }]);
      }

      function getDateString(date_epoch) {
          var d = new Date(date_epoch);

          if (date_format == "dmy") {
              return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
          } else {
              return (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear();
          }
      }

      function getDateEpoch(string) {
          var date_string = string.split('/');
          var date;
          if (date_format == "dmy") {
              date = new Date(date_string[2] + "-" + date_string[1] + "-" + date_string[0]);
          } else {
              date = new Date(date_string[2] + "-" + date_string[0] + "-" + date_string[1]);
          }
          return date.getTime();
      }

      function getDateObject(string) {
          var date_string = string.split('/');
          var date;
          if (date_format == "dmy") {
              date = new Date(date_string[2] + "-" + date_string[1] + "-" + date_string[0]);
          } else {
              date = new Date(date_string[2] + "-" + date_string[0] + "-" + date_string[1]);
          }
          return date;
      }

      function saveReport() {
          var from = new Date($("#from").val());
          var to = new Date($("#to").val());
          var from_date = from.getDate() + "_" + (from.getMonth() + 1) + "_" + from.getFullYear();
          var to_date = to.getDate() + "_" + (to.getMonth() + 1) + "_" + to.getFullYear();
          var file_name = "Report" + from_date + "_to_" + to_date + ".txt";

          var data = " Team Members\n--------------\n\n";
          var printMembers = function(name) {
              data = data + name + "\n";
          };
          forEach(team_members, printMembers);

          data = data + "\n\n Details\n------------\n\n";

          var printData = function(row) {
              var date_epoch = row.Date;
              var date = getDateString(date_epoch);
              data = data + date + "\t\t\t" + row.PaidBy + " --> " + row.PaidTo + "\t\t\t" + row.PaidFor + "\t\t\t\t\t" + row.Amount + " " + currency + "\n";
          };
          forEach(_data, printData);

          data = data + "\n\n Share Contribution \n--------------------\n\n";

          var total_amount = 0;
          var printTeamContribution = function(key) {
              var name = key.split('->');
              total_amount += contribution.Team[key];
              data = data + name[0] + " has spent to team " + contribution.Team[key] + " " + currency + "\n";
          };
          forEach(_.keys(contribution.Team), printTeamContribution);

          var printMemberContribution = function(key) {
              var name = key.split('->');
              var pb_name = name[0];
              var pt_name = name[1];
              if (pb_name == pt_name) {
                  data = data + pb_name + " has spent " + nz_contribution[key] + " " + currency + " for himself\n";
              } else {
                  data = data + pt_name + " need to give " + nz_contribution[key] + " " + currency + " to " + pb_name + "\n";
              }
          };
          forEach(_.keys(nz_contribution), printMemberContribution);

          if (total_amount != 0) {
              data = data + "Total amount spent to team = " + total_amount + " " + currency + "\n";
              var share = total_amount / team_size;
              if (team_size > 1) {
                  data = data + "Individual share = " + share.toFixed(2) + " " + currency;
              }
          }

          file.fs.root.getFile(file_name, {
              create: true,
              exclusive: false
          }, gotFileEntry, fail);
          file.writer.write(data);
          toast.show("Report Saved to the " + file.fileobj.fullPath, 1);
      }

      function gotFS(fileSystem) {
          file.fs = fileSystem;
      }

      function call_calc_popup() {
          $("#contribution").html("");
          $("#cPopup").popup("open");
          $("#teampay").val("");
          //        calcCommonExpense();
          //$("#calc_button").bind("click", calcCommonExpense);
      }

      function gotFileEntry(fileEntry) {
          file.fileobj = fileEntry;
          fileEntry.createWriter(gotFileWriter, fail);
      }

      function gotFileWriter(writer) {
          file.writer = writer;
      }

      function fail(error) {
          toast.show("File operation failed !", 1);
          console.log("------ " + error.code);
      }


      function calcCommonExpense() {
          var teampay = ($("#teampay").val() / team_size) + share;
          var con = {};
          var ct = {};
          var flag = 0;
          var findCommonExpense = function(key) {
              var name = key.split('->');
              if ((teampay - contribution.Team[key]) < 0) {
                  flag = 1;
                  for (var i = 0; i < team_size; i++) {
                      if (name[0] != team_members[i]) {
                          var ft = name[0] + "->" + team_members[i];
                          con[ft] = ((teampay - contribution.Team[key]) * -1) / (team_size - 1);
                      }
                  }
                  //$("#contribution").append('<li><b>' + name[0] + '</b> need to get ' + (((teampay - contribution.Team[key]) * -1).toFixed(2)) + ' '+currency+'</li>');
              } else {
                  var ft = name[0] + "->Team";
                  ct[ft] = (teampay - contribution.Team[key]) / (team_size - 1);
                  // $("#contribution").append('<li><b>' + name[0] + '</b> need to pay ' + (teampay - contribution.Team[key]).toFixed(2) + ' '+currency+'</li>');
              }
          };
          forEach(_.keys(contribution.Team), findCommonExpense);

          if (flag == 1) {
              $("#contribution").html("<center>Split Up</center>");
              _.each(_.keys(ct), function(key) {
                  var name = key.split('->');
                  for (var i = 0; i < team_size; i++) {
                      if (name[0] != team_members[i]) {

                          var ft = team_members[i] + "->" + name[0];
                          if (_.isUndefined(con[ft])) {
                              con[ft] = ct[key];
                          } else {
                              if (con[ft] < ct[key]) {
                                  con[ft] = ct[key];
                              }
                              //con[ft] = con[ft] + ct[key];
                          }
                      }
                  }
              });
          } else {
              $("#contribution").html("<center>Need to Pay</center>");
              _.each(_.keys(ct), function(key) {
                  var name = key.split('->');
                  if (flag == 0) {
                      ct[key] = ct[key] * (team_size - 1);
                  }
                  $("#contribution").append('<li><b>' + name[0] + '</b> need to pay ' + ct[key].toFixed(2) + '  ' + currency + '</li>');
              });
          }

          var fix_contribution = function(key) {
              var name = key.split('->');
              var ft = key;
              var tf = name[1] + "->" + name[0];
              if (_.isUndefined(con[tf])) {
                  con[tf] = 0;
              }
              if (ft != tf) {
                  if (con[ft] > con[tf]) {
                      con[ft] = con[ft] - con[tf];
                      con[tf] = 0;
                  } else if (con[ft] < con[tf]) {
                      con[tf] = con[tf] - con[ft];
                      con[ft] = 0;
                  } else {
                      con[ft] = 0;
                      con[tf] = 0;
                  }
              }
          };
          forEach(_.keys(con), fix_contribution);

          var printMemberContribution = function(key) {
              var name = key.split('->');
              var pb_name = name[0];
              var pt_name = name[1];
              if (con[key] > 0) {
                  $("#contribution").append('<li><b>' + pt_name + '</b> need to give ' + con[key].toFixed(2) + ' ' + currency + ' to ' + pb_name + '</li>');
              }
          };
          forEach(_.keys(con), printMemberContribution);
          $('#contribution').listview('refresh');
      }

      function showBarGraph() {
          var max = 0;
          if (_.size(ir_data) > 0) {
              max = ir_data[_.size(ir_data) - 1][0];
              max = parseInt(max);
              max = max - (max % 10) + 20;
          }
          var plot1 = $.jqplot('item-report', [
              ir_data
          ], {
              title: "Item wise report",
              seriesDefaults: {
                  renderer: $.jqplot.BarRenderer,
                  pointLabels: {
                      show: true,
                      location: 'e',
                      edgeTolerance: -15
                  },
                  shadowAngle: 135,
                  rendererOptions: {
                      barDirection: 'horizontal',
                  }
              },
              axesDefaults: {
                  tickRenderer: $.jqplot.CanvasAxisTickRenderer,
                  tickOptions: {
                      angle: -90,
                      fontSize: '10pt'
                  }
              },
              axes: {
                  xaxis: {
                      //   label:'Amount spent (INR)',
                      //pad: 0
                      min: 0,
                      max: max
                  },

                  yaxis: {
                      //label:'Items',
                      tickOptions: {
                          fontSize: '10pt',
                          fontFamily: 'Tahoma',
                          angle: 0
                      },
                      renderer: $.jqplot.CategoryAxisRenderer,
                  },
              }
          });
      }

      function showPieGraph() {
          var plot2 = jQuery.jqplot('user-report', [cr_data], {
              title: "Contribution chart",
              seriesDefaults: {
                  renderer: jQuery.jqplot.PieRenderer,
                  rendererOptions: {
                      sliceMargin: 4,
                      showDataLabels: true
                  }
              },
              legend: {
                  show: true,
                  location: 'e'
              }
          });
      }
