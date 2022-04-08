const ctx1 = document.getElementById('myCompareChart');
var data = []
var labels = []
var avgResults = []
for (var x of '<%= dataSet %>'.split(',')) {
    data.push(x);
}
for (var x of '<%= labels %>'.split(',')) {
    labels.push(x);
}
for (var x of '<%= avgResults %>'.split(',')) {
    avgResults.push(x);
}
var dataObj = {
    labels: labels,
    datasets: [
        {
            label: 'Current Employee',
            backgroundColor: "#3e95cd",
            data: data
        }, {
            label: "Average of Employee",
            backgroundColor: "#8e5ea2",
            data: avgResults
        }

    ]
}
var optionsObj = {
    maintainAspectRatio: false,
    title: {
        display: true,
        text: 'Predicted world population (millions) in 2050'
    }
}
new Chart(ctx1, {
    type: 'bar',
    data: dataObj,
    options: optionsObj
});