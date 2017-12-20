$('#last').hide()
$('#currencyName').on('change', function(e) {
    $('#last').hide();
    $.get('/marketTicker', {marketName: e.target.value}, function(data) {
        $('#last').text('Last value of ' + e.target.value + ': ' + data.result.Last).show();
    })
})