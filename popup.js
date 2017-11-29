const API_KEY = 'FY5QTR0KF1HCBMZA';

$(document).ready(() => {
  // Get the current active tab name
  let activeTab = getActiveTab();
  loadCurrentTab(activeTab);

  $('.nav-item').click(function () {
    $('.nav-item').removeClass('active');
    $(this).addClass('active');
    activeTab = getActiveTab();
    loadCurrentTab(activeTab);
  });
});

/** FUNCTIONS FOR NAVIGATION **/
function getActiveTab () {
  return $('nav').find('.active').text();
}

function loadCurrentTab (tabName) {
  clearInterval(window.interval);
  if (tabName === 'Stocks') {
    $('#content').load('stock.html', function () {
      updateStockValues();
      window.interval = setInterval(function () {
        updateStockValues();
      }, 60000);
      bindStockActionButtons();
    });
  } else if (tabName === 'Currency') {
    $('#content').load('currency.html', function () {
			updateCurrencyValues();
			window.interval = setInterval(function () {
				updateCurrencyValues();
			}, 60000);
			bindCurrencyActionButtons();
    });
  }
}

/** FUNCTIONS FOR STOCK CONTENT **/
async function updateStockValues () {
  let currentStocks = await getCurrentStocks();
  if (!currentStocks) { return; }
  $('#stock-table tbody').empty();
  let loader = $('<tr><td><p class="saving"><span>.</span><span>.</span><span>.</span></p></td></tr>');
  $('#stock-table tbody').append(loader);
	await updateStockYtdClose(currentStocks);
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

async function bindStockActionButtons () {
  $('#stock-add').click(async function() {
    let userInput = $('#stock-input').val();
    $('#stock-input').val('');
    if (!userInput) { return; }
    await addStock(userInput);
    updateStockValues();
  });

  $('#stock-remove').click(async function () {
    let userInput = $('#stock-input').val();
    $('#stock-input').val('');
    if (!userInput) { return; }
    await removeStock(userInput);
    updateStockValues();
  });
}

/** FUNCTIONS FOR CURRENCY CONTENT **/
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

async function updateCurrencyValues () {
	let currentCurrencies = await getCurrentCurrencies();
  if (!currentCurrencies) { return; }
  $('#currency-table tbody').empty();
  let loader = $('<tr><td><p class="saving"><span>.</span><span>.</span><span>.</span></p></td></tr>');
  $('#currency-table tbody').append(loader);
  for (let currency of currentCurrencies) {
    let quote = await getCurrencyValue(currency.from, currency.to);
    // Create a row
    let row = $('<tr></tr>');
    row.append($('<td></td>').text(quote['1. From_Currency Code']));
    row.append($('<td></td>').text('$1'));
    row.append($('<td></td>').text(quote['3. To_Currency Code']));
		row.append($('<td></td>').text(quote['5. Exchange Rate']));
    $('#currency-table tbody').prepend(row);
  }
  loader.remove();
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

async function bindCurrencyActionButtons () {
  $('#currency-add').click(async function() {
    let userFrom = $('#currency-from-input').val();
		let userIn = $('#currency-in-input').val();
    $('#currency-from-input').val('');
		$('#currency-in-input').val('');
    if (!userFrom || !userIn) { return; }
    await addCurrencies(userFrom, userIn);
    updateCurrencyValues();
  });

  $('#currency-remove').click(async function () {
    let userFrom = $('#currency-from-input').val();
		let userIn = $('#currency-in-input').val();
    $('#currency-from-input').val('');
		$('#currency-in-input').val('');
    if (!userFrom || !userIn) { return; }
    await removeStock(userFrom, userIn);
    updateCurrencyValues();
  });
}