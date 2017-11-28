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
	for(let stock of currentStocks) {
		tempStocks.push(stock);
	}
	let stockIncluded = false;
	for (let tempStock of tempStocks) {
		if (tempStock.symbol === stockSymbol) {
			stockIncluded = true;
		}
	}
	if (!stockIncluded) {
		let stock = {};
		stock.symbol = stockSymbol;
		let ytdStock = await getYtdCloseStockValue(stockSymbol);
		stock.closePrice = ytdStock[0];
		stock.ytdCloseDate = ytdStock[1];
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
	for (let stock of currentStocks) {
		if (stock.symbol === stockSymbol) { return; }
		tempStocks.push(stock);
	}
	return new Promise(function(resolve, reject) {
		resolve(chrome.storage.local.set({ stocks: tempStocks }));
	});
}

async function updateStockValues() {
	let currentStocks = await getCurrentStocks();
	if (!currentStocks) { return; }
	$('#stock-table tbody').empty();
	let loader = $('<tr><td><p class="saving"><span>.</span><span>.</span><span>.</span></p></td></tr>');
	$('#stock-table tbody').append(loader);
	for (let stock of currentStocks) {
		let quote = await getStockValue(stock.symbol);
		// Create a row
		let row = $('<tr></tr>');
		row.append($('<td></td>').text(stock.symbol));
		row.append($('<td></td>').text(stock.closePrice));
		row.append($('<td></td>').text(quote['1. open']));
		let difference = (quote['1. open'] - stock.closePrice).toFixed(2);
		row.append($('<td></td>').text(`${difference > 0 ? '+' : ''}${difference} (${((difference / stock.closePrice) * 100).toFixed(2)}%)`));
		(quote['1. open'] - stock.closePrice > 0) ? row.addClass('gain-text') : row.addClass('loss-text');
		$('#stock-table tbody').prepend(row);
	}
	loader.remove();
}

function loadCurrentTab(tabName) {
	clearInterval(window.interval);
	if (tabName === 'Stocks') {
		$('#content').load('stock.html', function() {
			updateStockValues();
			window.interval = setInterval(function() {
				updateStockValues();
			}, 60000)
			bindStockActionButtons();
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

function getYtdCloseStockValue(symbol) {
	return new Promise(function(resolve, reject) {
		let xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function () {
			if(xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
				let jsonResponse = JSON.parse(xhr.response);
				let quoteObject = jsonResponse['Time Series (Daily)'];
				let lastRefresh = Object.keys(quoteObject)[1];
				let ytdPrice = quoteObject[lastRefresh];
				resolve([ytdPrice['4. close'], lastRefresh]);
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

async function bindStockActionButtons() {
	$('#stock-add').click(async function() {	
		let userInput = $('#stock-input').val();
		$('#stock-input').val('');
		if (!userInput) { return; }
		await addStock(userInput);
		updateStockValues();
	});
	
	$('#stock-remove').click(async function() {
		let userInput = $('#stock-input').val();
		$('#stock-input').val('');
		if (!userInput) { return; }
		await removeStock(userInput);
		updateStockValues();
	});
}