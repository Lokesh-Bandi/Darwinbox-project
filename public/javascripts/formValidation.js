function validateForm() {
    var fname = document.getElementById("fname").value;
    var lname = document.getElementById("lname").value;
    var pos = document.getElementById("Position").value;
    var managerName = document.getElementById("ManagerName").value;
    var jd = document.getElementById("DateofHire").value;
    var dept = document.getElementById("Department").value;

    if (fname == "") {
        $("#fErr").html("First name should not empty")
        $("#fErr").show()
        return false;
    }
    if (lname == "") {
        $("#lErr").html("Last name should not empty")
        $("#lErr").show()
        return false;
    }
    if (pos == "None") {
        $("#posErr").html("Please select one")
        $("#posErr").show()
        return false
    }
    if (managerName == "None") {
        $("#mgrErr").html("Please select one")
        $("#mgrErr").show()
        return false
    }
    if (jd == "") {
        $("#jdErr").html("Should not be empty")
        $("#jdErr").show()
        return false
    }
    if (dept == "None") {
        $("#deptErr").html("Please select one")
        $("#deptErr").show()
        return false
    }

}

function validateField(eleID, errID) {
    var inputID = document.getElementById(eleID).value
    var errTagID = document.getElementById(errID)
    console.log(eleID, errTagID)
    if (inputID == "") {
        errTagID.innerHTML = "Please fill the field"
        $(errTagID).show()
    }
    if (eleID == "lname" || eleID == "fname") {

        if (inputID.match(/[0-9]/)) {
            errTagID.innerHTML = 'Only alphabets are allowed'
            $(errTagID).show()
        }
        else {
            $(errTagID).hide()
        }
    }
    if (eleID == "Department" || eleID == "ManagerName" || eleID == "Position") {
        if (inputID == "None") {
            errTagID.innerHTML = "Please fill the field"
            $(errTagID).show()
        }
        else {
            $(errTagID).hide()
        }
    }
    if(eleID=="DateofHire"){
        if(inputID){
            $(errTagID).hide()
        }
    }
}
