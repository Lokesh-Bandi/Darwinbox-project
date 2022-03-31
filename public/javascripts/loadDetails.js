window.onload=function(){
    document.getElementById('id').value=localStorage.getItem('id')
    document.getElementById('ename').value=localStorage.getItem('ename')
    document.getElementById('des').value=localStorage.getItem('des')
    document.getElementById('loc').value=localStorage.getItem('loc')
    document.getElementById('jd').value=localStorage.getItem('jd')

    localStorage.clear();
}