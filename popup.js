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
	
	$('#stock-add-input').keypress(async function (e) {
		if (e.which !== 13) {
			return;
		}
		let symbol = $('#stock-add-input').text().toUpperCase().trim();
		$('#stock-add-input').text('');
		$('#stock-add-input-wrapper').toggleClass('expanded');
		await addStock(symbol);
		let activeTab = getActiveTab();
		await loadCurrentTab(activeTab);
	});
	
	$('#stock-remove-input').keypress(async function (e) {
		if (e.which !== 13) {
			return;
		}
		let symbol = $('#stock-remove-input').text().toUpperCase().trim();
		$('#stock-remove-input').text('');
		$('#stock-remove-input-wrapper').toggleClass('expanded');
		await removeStock(symbol);
		let activeTab = getActiveTab();
		await loadCurrentTab(activeTab);
	});
	
	$('#currency-add-input-1').keypress(async function (e) {
		if (e.which !== 13) {
			return;
		}
		let fromSymbol = $('#currency-add-input-1').text().toUpperCase().trim();
		let toSymbol = $('#currency-add-input-2').text().toUpperCase().trim();
		$('#currency-add-input-1').text('');
		$('#currency-add-input-2').text('');
		$('#currency-add-input').toggleClass('expanded');
		await addCurrencies(fromSymbol, toSymbol);
		let activeTab = getActiveTab();
		await loadCurrentTab(activeTab);
	});
	
	$('#currency-add-input-2').keypress(async function (e) {
		if (e.which !== 13) {
			return;
		}
		let fromSymbol = $('#currency-add-input-1').text().toUpperCase().trim();
		let toSymbol = $('#currency-add-input-2').text().toUpperCase().trim();
		$('#currency-add-input-1').text('');
		$('#currency-add-input-2').text('');
		$('#currency-add-input').toggleClass('expanded');
		await addCurrencies(fromSymbol, toSymbol);
		let activeTab = getActiveTab();
		await loadCurrentTab(activeTab);
	});
	
	$('#currency-remove-input-1').keypress(async function (e) {
		if (e.which !== 13) {
			return;
		}
		let fromSymbol = $('#currency-remove-input-1').text().toUpperCase().trim();
		let toSymbol = $('#currency-remove-input-2').text().toUpperCase().trim();
		$('#currency-remove-input-1').text('');
		$('#currency-remove-input-2').text('');
		$('#currency-remove-input').toggleClass('expanded');
		await removeCurrencies(fromSymbol, toSymbol);
		let activeTab = getActiveTab();
		await loadCurrentTab(activeTab);
	});
	
	$('#currency-remove-input-2').keypress(async function (e) {
		if (e.which !== 13) {
			return;
		}
		let fromSymbol = $('#currency-remove-input-1').text().toUpperCase().trim();
		let toSymbol = $('#currency-remove-input-2').text().toUpperCase().trim();
		$('#currency-remove-input-1').text('');
		$('#currency-remove-input-2').text('');
		$('#currency-remove-input').toggleClass('expanded');
		await removeCurrencies(fromSymbol, toSymbol);
		let activeTab = getActiveTab();
		await loadCurrentTab(activeTab);
	});

	$('#add').click(function () {
		let activeTab = getActiveTab();
		if (activeTab === 'stock-nav') {
			$('#stock-add-input-wrapper').toggleClass('expanded');
			$('#stock-add-input').focus();
		} else if (activeTab === 'currency-nav') {
			$('#currency-add-input').toggleClass('expanded');
			$('#currency-add-input-1').focus();
		}
	});

	$('#remove').click(function () {
		let activeTab = getActiveTab();
		if (activeTab === 'stock-nav') {
			$('#stock-remove-input-wrapper').toggleClass('expanded');
			$('#stock-remove-input').focus();
		} else if (activeTab === 'currency-nav') {
			$('#currency-remove-input').toggleClass('expanded');
			$('#currency-remove-input-1').focus();
		}
	});
	
	/**
	FUNCTIONS FOR NAVIGATION 
	**/
	function getActiveTab () {
		return $('.nav-icon.active-icon').attr('id');
	}

	async function loadCurrentTab (tabName) {
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
				loadCurrencyCards().then(function (result) {
					currencyCards = result;
				});
				window.interval = setInterval(function () {
					updateCurrencyValues(currencyCards);
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

	/**
	FUNCTIONS FOR STOCK CONTENT
	**/
	async function loadStockCards () {
		let currentStocks = await getCurrentStocks();
		if (!currentStocks || currentStocks.length === 0) {
			$('#stock-content').append($('<h2 class="empty-content">No Stocks Watched</h2>'));
			return;
		}
		$('#stock-content').empty();
		setLoading();
		currentStocks = await updateStockYtdClose(currentStocks);
		let stockElements = [];
		for(let stock of currentStocks) {
			let quote;
			try {
				quote = await getStockValue(stock.symbol);
			} catch (e) {
				console.log(e);
				return [];
			}
			let stockCard = createStockCard(stock.symbol, parseFloat(quote['1. open']), stock.closePrice);
			$('#stock-content').append(stockCard);
			stockElements.push(stockCard);
		}
		closeLoading();
		return stockElements;
	}

	async function addStock (stockSymbol) {
		return new Promise(async function (resolve, reject) {
			setLoading();
			try {
				let quote = await getStockValue(stockSymbol);
				console.log(quote);
			} catch (e) {
				console.log(e);
				closeLoading();
				return;
			}
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
				let ytdStock;
				stock.symbol = stockSymbol;
				tempStocks.push(stock);
			}
			chrome.storage.local.set({ stocks: tempStocks }, function() {
				resolve(tempStocks);
			});
			closeLoading();
		});
	}

	async function removeStock (stockSymbol) {
		return new Promise(async function (resolve, reject) {
			setLoading();
			let tempStocks = [];
			let currentStocks = await getCurrentStocks();
			for (let stock of currentStocks) {
				if (stock.symbol === stockSymbol) { continue; }
				tempStocks.push(stock);
			}
			chrome.storage.local.set({ stocks: tempStocks }, function() {
				resolve(tempStocks);
			});
			closeLoading();
		});
	}

	function getCurrentStocks () {
		return new Promise(function (resolve, reject) {
			chrome.storage.local.get('stocks', function(storage) {
				let currStocks = [];
				if (storage.stocks === undefined) { 
					resolve(currStocks);
					return;
				}
				for (let stock of storage.stocks) {
					if (!stock.symbol || stock.symbol === '') { continue; }
					currStocks.push(stock);
				}
				resolve(currStocks);
			});
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

	function getStockValue (symbol) {
		return new Promise(function (resolve, reject) {
			let xhr = new XMLHttpRequest();
			xhr.onreadystatechange = function () {
				if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
					let jsonResponse = JSON.parse(xhr.response);
					// Gets the most recent quote
					let quoteObject = jsonResponse['Time Series (1min)'];
					if (!quoteObject) {
						reject({ reason: 'Invalid Stock Symbol' });
						return;
					}
					let lastRefresh = jsonResponse['Meta Data']['3. Last Refreshed'];
					resolve(quoteObject[lastRefresh]);
				}
			};
			xhr.open('GET', `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=1min&outputSize=compact&datatype=json&apikey=${API_KEY}`);
			xhr.send();
		});
	}

	function clearStocks () {
		return new Promise(function (resolve, reject) {
			let empty = [];
			chrome.storage.local.set({ stocks: empty }, function () {
				resolve('Cleared Cache');
			});
		});
	}

	function createStockCard(symbol, currPrice, startPrice) {
		let card = $('<div class="card"></div>');
		let stockSymbol = $('<div class="stock-symbol"></div>').text(symbol);
		let stockDetails = $('<div class="stock-details"></div>');
		let stockCurrPrice = $('<div class="stock-detail currPrice"></div>').text((currPrice).toFixed(2));
		
		let stockDifference = $('<div class="stock-detail difference"></div>').text(`${Math.abs(currPrice - startPrice).toFixed(2)} (${(((currPrice - startPrice) / startPrice) * 100).toFixed(2)}%)`);
		if (currPrice - startPrice >= 0) {
			card.addClass('stock-gain');
			stockDifference.prepend($('<span><img src="up_arrow.png" class="icon"></span>'));
		} else {
			card.addClass('stock-loss');
			stockDifference.prepend($('<span><img src="down_arrow.png" class="icon"></span>'));
		}
		stockDetails.append(stockCurrPrice);
		stockDetails.append(stockDifference);
		card.append(stockSymbol);
		card.append(stockDetails);
		return card;
	}

	async function updateStockValues (stockElements) {
		if (!stockElements) { return; }
		for (let element of stockElements) {
			let symbol = element.find('.stock-symbol').text();
			let currPriceElement = element.find('.stock-detail.currPrice');
			let currPrice = parseFloat(element.find('.stock-detail.currPrice').text());
			let differenceElement = element.find('.stock-detail.difference');
			let difference = parseFloat(element.find('.stock-detail.difference').text());

			let quote;
			try {
				quote = await getStockValue(symbol);
			} catch (e) {
				console.log(e);
				return;
			}
			currPriceElement.text(parseFloat(quote['1. open']).toFixed(2));
			differenceElement.text(((parseFloat(quote['1. open']) - currPrice) + difference).toFixed(2));
		}
	}

	async function updateStockYtdClose (currentStocks) {
		return new Promise(async function (resolve, reject) {
			let tempStocks = [];
			let currentDate = new Date();
			let ytdDate = new Date(currentDate.getTime());
			ytdDate.setDate(currentDate.getDate() - 1);
			let ytdDateString = `${ytdDate.getFullYear()}-${ytdDate.getMonth() + 1}-${(ytdDate.getDate() < 10) ? '0' + ytdDate.getDate() : ytdDate.getDate()}`;
			for (let stock of currentStocks) {
				if (stock.symbol && (!stock.ytdCloseDate || stock.ytdCloseDate !== ytdDateString)) {
					let ytdStock = await getYtdCloseStockValue(stock.symbol);
					tempStocks.push({ symbol: stock.symbol, closePrice: ytdStock[0], ytdCloseDate: ytdStock[1] });
				}	else {
					tempStocks.push(stock);
				}
			}
			chrome.storage.local.set({ stocks: tempStocks }, function () {
				resolve(tempStocks);
			});
		});
	}

	/**
	---------------- FUNCTIONS FOR CURRENCY CONTENT ----------------
	Includes:
	Adding Currencies
	Removing Currencies
	**/
	async function loadCurrencyCards () {
		let currentCurrencies = await getCurrentCurrencies();
		if (!currentCurrencies || currentCurrencies.length === 0) {
			$('#currency-content').append($('<h2 class="empty-content">No Currencies Watched</h2>'));
			return;
		}
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
		let icon = $('<div class="compare-icon-wrapper"><img src="compare.png" style="width:30px;"></div>');
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

	async function updateCurrencyValues (currencyElements) {
		if (!currencyElements) { return; }
		for (let element of currencyElements) {
			let fromSymbol = element.find('.currency-from .currency-symbol').text();
			let toSymbol = element.find('.currency-to .currency-symbol').text();
			let fromPrice = element.find('.currency-from .currency-value');
			let toPrice = element.find('.currency-to .currency-value');

			let quote = await getCurrencyValue(fromSymbol, toSymbol);

			fromPrice.text('1.00');
			toPrice.text(parseFloat(quote['5. Exchange Rate']));
		}
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

	async function addCurrencies (from, to) {
		return new Promise(async function (resolve, reject) {
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
			chrome.storage.local.set({ currencies: tempCurrencies }, function () {
				resolve(tempCurrencies);
			});
		});
	}

	async function removeCurrencies (from, to) {
		return new Promise(async function (resolve, reject) {
			let tempCurrencies = [];
			let currentCurrencies = await getCurrentCurrencies();
			for (let currency of currentCurrencies) {
				if (currency.from === from && currency.to === to) { continue; }
				tempCurrencies.push(currency);
			}
			chrome.storage.local.set({ currencies: tempCurrencies }, function () {
				resolve(tempCurrencies);
			});
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
			chrome.storage.local.set({ currencies: [] }, function(storage) {
				resolve('All cleared');
			});
		});
	}
});