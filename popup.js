const API_KEY = 'FY5QTR0KF1HCBMZA';

$(document).ready(() => {
  // Get the current active tab name
  let activeTab = getActiveTab();
  loadCurrentTab(activeTab);

  $('.nav-icon').click(function () {
		closeLoading();
		activeTab = getActiveTab();
		if (activeTab === $(this).attr('id')) {
			return;
		}
		$('.nav-icon').removeClass('active-icon');
    $(this).addClass('active-icon');
		activeTab = getActiveTab();
    loadCurrentTab(activeTab);
  });
});

/** FUNCTIONS FOR NAVIGATION **/
function getActiveTab () {
  return $('.nav-icon.active-icon').attr('id');
}

function loadCurrentTab (tabName) {
  clearInterval(window.interval);
  if (tabName === 'stock-nav') {
    $('#content').load('stock.html', function () {
			let stockCards;
      loadStockCards().then(function (result) {
				stockCards = result;
			});
      window.interval = setInterval(function () {
        updateStockValues(stockCards);
      }, 60000);
    });
  } else if (tabName === 'currency-nav') {
    $('#content').load('currency.html', function () {
			let currencyCards;
			loadCurrencyCard().then(function (result) {
				currencyCards = result;
			});
			window.interval = setInterval(function () {
				updateCurrencyValues();
			}, 60000);
    });
  }
}

function setLoading () {
	$('#loading-wrap').removeAttr('class');
}

function closeLoading () {
	$('#loading-wrap').addClass('hidden');
}

/** FUNCTIONS FOR STOCK CONTENT **/
async function loadStockCards () {
	let currentStocks = await getCurrentStocks();
	if (!currentStocks) { return; }
	$('#stock-content').empty();
	setLoading();
	await updateStockYtdClose(currentStocks);
	let stockElements = [];
	for(let stock of currentStocks) {
		let quote = await getStockValue(stock.symbol);
		let stockCard = createStockCard(stock.symbol, parseFloat(quote['1. open']), stock.closePrice);
		$('#stock-content').append(stockCard);
		stockElements.push(stockCard);
	}
	closeLoading();
	return stockElements;
}

async function updateStockValues (stockElements) {
	for (let element of stockElements) {
		let symbol = element.find('.stock-symbol').text();
		let currPriceElement = element.find('.stock-detail.currPrice');
		let currPrice = parseFloat(element.find('.stock-detail.currPrice').text());
		let differenceElement = element.find('.stock-detail.difference');
		let difference = parseFloat(element.find('.stock-detail.difference').text());

		let quote = await getStockValue(symbol);
		currPriceElement.text(parseFloat(quote['1. open']).toFixed(2));
		differenceElement.text(((parseFloat(quote['1. open']) - currPrice) + difference).toFixed(2));
	}
}

async function updateStockYtdClose (currentStocks) {
	let tempStocks = [];
	let currentDate = new Date();
	let ytdDate = new Date(currentDate.getTime());
	ytdDate.setDate(currentDate.getDate() - 1);
	let ytdDateString = `${ytdDate.getFullYear()}-${ytdDate.getMonth() + 1}-${ytdDate.getDate()}`;
	for (let stock of currentStocks) {
		if (stock.ytdCloseDate !== ytdDateString) {
			let ytdStock = await getYtdCloseStockValue(stock.symbol);
			tempStocks.push({ symbol: stock.symbol, closePrice: ytdStock[0], ytdCloseDate: ytdStock[1] });
		}	else {
			tempStocks.push(stock);
		}
	}
	return new Promise(function (resolve, reject) {
		resolve(chrome.storage.local.set({ stocks: tempStocks }));
	});
}

function getStockValue (symbol) {
  return new Promise(function (resolve, reject) {
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
      if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
        let jsonResponse = JSON.parse(xhr.response);
        // Gets the most recent quote
        let lastRefresh = jsonResponse['Meta Data']['3. Last Refreshed'];
        let quoteObject = jsonResponse['Time Series (1min)'];
        resolve(quoteObject[lastRefresh]);
      }
    };
    xhr.open('GET', `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=1min&outputSize=compact&datatype=json&apikey=${API_KEY}`);
    xhr.send();
  });
}

function getYtdCloseStockValue (symbol) {
  return new Promise(function (resolve, reject) {
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
      if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
        let jsonResponse = JSON.parse(xhr.response);
        let quoteObject = jsonResponse['Time Series (Daily)'];
        let lastRefresh = Object.keys(quoteObject)[1];
        let ytdPrice = quoteObject[lastRefresh];
        resolve([ytdPrice['4. close'], lastRefresh]);
      }
    };
    xhr.open('GET', `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputSize=compact&datatype=json&apikey=${API_KEY}`);
    xhr.send();
  });
}

async function addStock (stockSymbol) {
  let tempStocks = [];
  let currentStocks = await getCurrentStocks();
  let stockIncluded = false;
  for (let stock of currentStocks) {
    tempStocks.push(stock);
    if (stock.symbol === stockSymbol) {
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
  return new Promise(function (resolve, reject) {
    resolve(chrome.storage.local.set({ stocks: tempStocks }));
  });
}

async function removeStock (stockSymbol) {
  let tempStocks = [];
  let currentStocks = await getCurrentStocks();
  for (let stock of currentStocks) {
    if (stock.symbol === stockSymbol) { continue; }
    tempStocks.push(stock);
  }
  return new Promise(function (resolve, reject) {
    resolve(chrome.storage.local.set({ stocks: tempStocks }));
  });
}

function getCurrentStocks () {
  return new Promise(function (resolve, reject) {
    chrome.storage.local.get('stocks', function(storage) {
      resolve(storage.stocks);
    });
  });
}

function clearStocks () {
  return new Promise(function (resolve, reject) {
    let empty = [];
    chrome.storage.local.set({ stocks: empty });
    resolve('Cleared Cache');
  });
}

function createStockCard(symbol, currPrice, startPrice) {
	let card = $('<div class="card"></div>');
	let stockSymbol = $('<div class="stock-symbol"></div>').text(symbol);
	let stockDetails = $('<div class="stock-details"></div>');
	let stockCurrPrice = $('<div class="stock-detail currPrice"></div>').text((currPrice).toFixed(2));
	let stockDifference = $('<div class="stock-detail difference"></div>').text(Math.abs(currPrice - startPrice).toFixed(2));
	if (currPrice - startPrice >= 0) {
		card.addClass('stock-gain');
		stockDifference.prepend($('<span><i class="material-icons" style="font-size:20px;">arrow_upward</i></span>'));
	} else {
		card.addClass('stock-loss');
		stockDifference.prepend($('<span><i class="material-icons" style="font-size:20px;">arrow_downward</i></span>'));
	}
	stockDetails.append(stockCurrPrice);
	stockDetails.append(stockDifference);
	card.append(stockSymbol);
	card.append(stockDetails);
	return card;
}

/** FUNCTIONS FOR CURRENCY CONTENT **/
async function loadCurrencyCard () {
	let currentCurrencies = await getCurrentCurrencies();
	if (!currentCurrencies) { return; }
	$('#currency-content').empty();
	setLoading();
	let currencyElements = [];
	for(let currency of currentCurrencies) {
		let quote = await getCurrencyValue(currency.from, currency.to);
		let currencyCard = createCurrencyCard(quote['1. From_Currency Code'], '1.00', quote['3. To_Currency Code'], parseFloat(quote['5. Exchange Rate']).toFixed(4));
		$('#currency-content').append(currencyCard);
		currencyElements.push(currencyCard);
	}
	closeLoading();
	return currencyElements;
}

function createCurrencyCard (fromSymbol, fromValue, toSymbol, toValue) {
	let card = $('<div class="card currency-back"></div>');
	let currencyFrom = $('<div class="currency-from"></div>');
	let icon = $('<div class="compare-icon-wrapper"><i class="material-icons">compare_arrows</i></div>');
	let currencyTo = $('<div class="currency-to"></div>');
	let currencyFromSymbol = $('<div class="currency-symbol"></div>').text(fromSymbol);
	let currencyToSymbol = $('<div class="currency-symbol"></div>').text(toSymbol);
	let currencyFromPrice = $('<div class="currency-value"></div>').text(fromValue);
	let currencyToPrice = $('<div class="currency-value"></div>').text(toValue);
	currencyFrom.append(currencyFromSymbol);
	currencyFrom.append(currencyFromPrice);
	currencyTo.append(currencyToSymbol);
	currencyTo.append(currencyToPrice);
	card.append(currencyFrom);
	card.append(icon);
	card.append(currencyTo);
	return card;
}
async function getCurrencyValue (from, to) {
  return new Promise(function (resolve, reject) {
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
      if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
				let jsonResponse = JSON.parse(xhr.response);
				resolve(jsonResponse['Realtime Currency Exchange Rate']);
      }
    };
    xhr.open('GET', `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${API_KEY}`);
    xhr.send();
  });
}

async function updateCurrencyValues (currencyElements) {
	for (let element of stockElements) {
		let symbol = element.find('.stock-symbol').text();
		let currPriceElement = element.find('.stock-detail.currPrice');
		let currPrice = parseFloat(element.find('.stock-detail.currPrice').text());
		let differenceElement = element.find('.stock-detail.difference');
		let difference = parseFloat(element.find('.stock-detail.difference').text());

		let quote = await getStockValue(symbol);
		currPriceElement.text(parseFloat(quote['1. open']).toFixed(2));
		differenceElement.text(((parseFloat(quote['1. open']) - currPrice) + difference).toFixed(2));
	}
}

async function addCurrencies (from, to) {
  let tempCurrencies = [];
  let currentCurrencies = await getCurrentCurrencies();
  let currencyIncluded = false;
	// Object to be added
	let newCurrency = {};
	newCurrency.from = from;
	newCurrency.to = to;
	if (currentCurrencies) {
		for (let currency of currentCurrencies) {
			tempCurrencies.push(currency);
			if (currency.from === from && currency.to === to) {
				currencyIncluded = true;
			}
  	}
		if (!currencyIncluded) {
			tempCurrencies.push(newCurrency);
		}
	} else {
		tempCurrencies.push(newCurrency);
	}
  
  return new Promise(function (resolve, reject) {
    resolve(chrome.storage.local.set({ currencies: tempCurrencies }));
  });
}

async function removeCurrencies (from, to) {
  let tempCurrencies = [];
  let currentCurrencies = await getCurrentCurrencies();
  for (let currency of currentCurrencies) {
    if (currency.from === from && currency.to === to) { continue; }
    tempCurrencies.push(currency);
  }
  return new Promise(function (resolve, reject) {
    resolve(chrome.storage.local.set({ currencies: tempCurrencies }));
  });
}

function getCurrentCurrencies () {
  return new Promise(function (resolve, reject) {
    chrome.storage.local.get('currencies', function(storage) {
      resolve(storage.currencies);
    });
  });
}

function clearCurrencies () {
	return new Promise(function (resolve, reject) {
		resolve(chrome.storage.local.set({ currencies: [] }));
	});
}