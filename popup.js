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
	let stockIncluded = false;
	for (let tempStock of tempStocks) {
		if (tempStock.symbol === stockSymbol) {
			stockIncluded = true;
		}
	}
	if (!stockIncluded) {
		let stock = {};
		stock.symbol = stockSymbol;
		dailyStock = await getDailyOpenStockValue(stockSymbol);
		stock.openPrice = dailyStock[0];
		stock.recentDate = dailyStock[1];
		tempStocks.push(stock);
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
		if (stock.symbol === stockSymbol) { return; }
		tempStocks.push(stock);
	});
	return new Promise(function(resolve, reject) {
		resolve(chrome.storage.local.set({ stocks: tempStocks }));
	});
}

async function updateStockValues() {
	let currentStocks = await getCurrentStocks();
	if (!currentStocks) { return; }
	$('#stock-table tbody').empty();
	currentStocks.forEach(async function(stock) {
		let quote = await getStockValue(stock.symbol);
		// Create a row
		let row = $('<tr></tr>');
		row.append($('<td></td>').text(stock.symbol));
		row.append($('<td></td>').text(stock.openPrice));
		row.append($('<td></td>').text(quote['1. open']));
		row.append($('<td></td>').text((quote['1. open'] - stock.openPrice).toFixed(3)));
		(quote['1. open'] - stock.openPrice > 0) ? row.addClass('gain-text') : row.addClass('loss-text');
		$('#stock-table tbody').append(row);
	});
}

function loadCurrentTab(tabName) {
	clearInterval(window.interval);
	if (tabName === 'Stocks') {
		$('#content').load('stock.html', function() {
			updateStockValues();
			window.interval = setInterval(function() {
				updateStockValues();
			}, 60000)
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
				resolve([openPrice['1. open'], lastRefresh]);
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

function clearStocks() {
	return new Promise(function(resolve, reject) {
		let empty = [];
		chrome.storage.local.set({ stocks: empty });
		resolve('Cleared Cache');
	});
}