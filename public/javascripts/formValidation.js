function validateForm(){
    var fname=document.getElementById("fname").value;
    var lname=document.getElementById("lname").value;
    var pos=document.getElementById("Position").value;
    var managerName=document.getElementById("ManagerName").value;
    var jd=document.getElementById("DateofHire").value;
    var dept=document.getElementById("Department").value;
    if(fname==""){
        $("#fErr").html("First name should not empty")
        return false;
    }
    if(fname.match(/[0-9]/)){
        $("#fErr").html("Only Alphabets are allowed")
        return false
    }
    if(lname==""){
        $("#lErr").html("Last name should not empty")
        return false;
    }
    if(lname.match(/[0-9]/)){
        $("#lErr").html("Only Alphabets are allowed")
        return false
    }
    if(pos=="None"){
        $("#posErr").html("Please select one")
        return false
    }
    if(managerName=="None"){
        $("#mgrErr").html("Please select one")
        return false
    }
    if(jd==""){
        $("#jdErr").html("Should not be empty")
        return false
    }
    if(dept=="None"){
        $("#deptErr").html("Please select one")
        return false
    }
    return true
    
}
