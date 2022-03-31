$("tr").click(function(){
    var tableLen=$("table tr").length;
    for(var i=1;i<tableLen;i++){
        if(i==this.rowIndex){
            localStorage.setItem("id",this.childNodes[1].innerHTML)
            localStorage.setItem("ename",this.childNodes[3].innerHTML)
            localStorage.setItem("des",this.childNodes[5].innerHTML)
            localStorage.setItem("loc",this.childNodes[7].innerHTML)
            localStorage.setItem("jd",this.childNodes[9].innerHTML)
            break;
        }
    }
    window.location.href = "form";
});
