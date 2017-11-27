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

async function addStock(stockSymbol) {
	let tempStocks = [];
	let currentStocks = await getCurrentStocks();
	if (!currentStocks) { return; }
	currentStocks.forEach(function(stock) {
		tempStocks.push(stock);
	});
	if (!tempStocks.includes(stockSymbol)) {
		tempStocks.push(stockSymbol);
	}
	return new Promise(function(resolve, reject) {
		resolve(chrome.storage.local.set({ stocks: tempStocks }));
	});
}

async function removeStock(stockSymbol) {
	let tempStocks = [];
	let currentStocks = await getCurrentStocks();
	if (!currentStocks) { return; }
	currentStocks.forEach(function(stock) {
		if (stock === stockSymbol) { return; }
		tempStocks.push(stock);
	});
	return new Promise(function(resolve, reject) {
		resolve(chrome.storage.local.set({ stocks: tempStocks }));
	});
}

async function updateValues() {
	let currentStocks = await getCurrentStocks();
	if (!currentStocks) { return; }
	$('#stock-content tbody').empty();
	currentStocks.forEach(async function(symbol) {
		let quote = await getStockValue(symbol);
		// Create a row
		let row = $('<tr class="gain-text"></tr>');
		row.append($('<td></td>').text(symbol));
		row.append($('<td></td>').text(quote['1. open']));
		row.append($('<td></td>').text(quote['2. high']));
		row.append($('<td></td>').text(quote['3. low']));
		$('#stock-content tbody').append(row);
	});
}

function loadCurrentTab(tabName) {
	if (tabName === 'Stocks') {
		$('#content').load('stock.html', function() {

		});
	} else if (tabName === 'Currency') {
		$('#content').load('currency.html', function() {

		});
	} else if (tabName === 'Analysis') {
		$('#content').load('analysis.html', function () {

		});
	}
}

function getActiveTab() {
	return $('nav').find('.active').text();
}

function getStockValue(symbol) {
	return new Promise(function(resolve, reject) {
		let xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function () {
			if(xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
				let jsonResponse = JSON.parse(xhr.response);
				// Gets the most recent quote
				let lastRefresh = jsonResponse['Meta Data']['3. Last Refreshed'];
				let quoteObject = jsonResponse['Time Series (1min)'];
				resolve(quoteObject[lastRefresh]);
			}
		}
		xhr.open('GET', `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=1min&outputSize=compact&datatype=json&apikey=${API_KEY}`);
		xhr.send();
	});
}

function getDailyOpenStockValue(symbol) {
	return new Promise(function(resolve, reject) {
		let xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function () {
			if(xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
				let jsonResponse = JSON.parse(xhr.response);
				let lastRefresh = jsonResponse['Meta Data']['3. Last Refreshed'].split(' ')[0];
				let quoteObject = jsonResponse['Time Series (Daily)'];
				let openPrice = quoteObject[lastRefresh];
				resolve(openPrice['1. open']);
			}
		}
		xhr.open('GET', `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputSize=compact&datatype=json&apikey=${API_KEY}`);
		xhr.send();
	})
}

function getCurrentStocks() {
	return new Promise(function(resolve, reject) {
		chrome.storage.local.get('stocks', function(storage) {
			resolve(storage.stocks);
		});
	});
}
