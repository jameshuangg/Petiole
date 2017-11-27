const API_KEY = 'FY5QTR0KF1HCBMZA';

$(document).ready(() => {
	// Get the current active tab name
	let activeTab = getActiveTab();
	loadCurrentTab(activeTab);

	$('.nav-item').click(function() {
		$('.nav-item').removeClass('active');
		$(this).addClass('active');
		activeTab = getActiveTab();
		loadCurrentTab(activeTab);
	});
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

function getActiveTab() {
	return $('nav').find('.active').text();
}
