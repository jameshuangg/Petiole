$(document).ready(() => {
	// Get the current active tab name
	var activeTab = $('nav').find('.active').text();
	loadCurrentTab(activeTab);
});

function loadCurrentTab(tabName) {
	if (tabName === 'Stocks') {
		$('#content').load('stock.html');
	} else if (tabName === 'Currency') {
		$('#content').load('currency.html');
	} else if (tabName === 'Analysis') {
		$('#content').load('analysis.html');
	}
}