$(document).ready(function() {
    $('.moment').each((i, item) => {
        var m = moment($(item).text());
        $(item).text(`${m.format('LTS')}  (${(m.fromNow())})`);
    });
});
