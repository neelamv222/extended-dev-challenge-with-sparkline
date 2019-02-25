// This is not really required, but means that changes to index.html will cause a reload.
require('./site/index.html');
// Apply the styles in style.css to the page.
require('./site/style.css');

// Change this to get detailed logging from the stomp library
global.DEBUG = false;

const url = "ws://localhost:8011/stomp";
const client = Stomp.client(url);
client.debug = function(msg) {
    if (global.DEBUG) {
        console.info(msg);
    }
};

client.connect({}, connectCallback, function(error) {
    alert(error.headers.message);

});

/* Function Name:	connectCallback		
 *
 * This function will call the subscribe function to subscribe to a destination. In other words to receive data from the server.
 * 
 * Note: Attaching "time" key to each object coming from the server to track the incoming time of each object, which will help in retrieving 
 * last 30 secs data for drawing graph.
 * 											 
 */
function connectCallback() {
	(function(){ 
		var getData = [], graphFlag = false, timeStamp = 0;
		client.subscribe("/fx/prices", function(m) {	// Getting data from the stomp server
			var timeStampObj = {}, getDataShift = [], getTimeVal = 0;	
			timeStamp = (Date.now()/1000)|0;
			timeStampObj = JSON.parse(m.body);
			timeStampObj.time = (Date.now()/1000)|0;
			getData.push(timeStampObj); 
			
			//The graphFlag var will set to true after 30 secs
			if(graphFlag===true){
				getDataShift = [];
				getTimeVal = timeStamp-30;
				getDataShift = getData.filter(function(value){
					return value.time>=getTimeVal;
				});
				var returnOfPerformOperations = allSameNameDataTogther(getDataShift);
				var ArrOfAllSimiliarName = returnOfPerformOperations[1]
				var returnOfCalMidPrice = calMidPrice(ArrOfAllSimiliarName);
			}
			mainFunction(getData, graphFlag, returnOfCalMidPrice);
		});

		//Runs after 30 seconds and used to set the graphFlag Variable as true, in order to draw the graph and do calculation based on it.
		window.setTimeout(function() {
			graphFlag = true;
		}, 30000);	
	})();
}

/* Function Name:	mainFunction		
 *
 * This function is the main function wherein all the calls to other functions are done.
 * 
 * @getData {Array}								- Array of objects contains data of currency pair coming from storm server.
 * @graphFlag {Boolean}							- This flag set to true after the 30 secs indicating that the graph will be drawn now for last 30 secs data.Values: 1>True 2>False 
 * @returnOfCalMidPrice {Array}					- Array of objects containing currency tow keys and values>1>Key:"name" Value:"Currency Pair name"
 *												 2>Key: "midVal" Value:"mid price of last 30 secs data"
 * 												 
 */
function mainFunction(getData, graphFlag, returnOfCalMidPrice) {
	var returnOfPerformOperations = [],SortedAllElms = [], ArrOfAllSimiliarName = [];
	returnOfPerformOperations = allSameNameDataTogther(getData);
	SortedAllElms = returnOfPerformOperations[0];
	ArrOfAllSimiliarName = returnOfPerformOperations[1];
	returnOfGetgetDataForTblDisplayReturn = getDataForTblDisplay(SortedAllElms);
	displayTable(returnOfGetgetDataForTblDisplayReturn ,returnOfCalMidPrice, graphFlag);
}

/* Function Name:	allSameNameDataTogther		
 *
 * This function does the following tasks:
 * 1>Get all the unique currency pair name and store it into an array "getAllUniqueNames".
 * 2>Generate an array of arrays containing data based on similar currency pair name and store it into array "ArrOfAllSimiliarName".
 * 3>Sort the resultant "ArrOfAllSimiliarName" array based on "lastChangeBid" value with data having highest lastChangeBid value appearing first.
 *
 * @getData {Array}								- Array of objects contains data of currency pair coming from storm server.												 2>Key: "midVal" Value:"mid price of last 30 secs data"
 * 												 
 */
function allSameNameDataTogther(getData){
	var getAllUniqueNames = [], ArrOfAllSimiliarName = [], SortedAllElms = [], returnOfGetgetDataForTblDisplayReturn = [], getSortedData = [], uniqueNameObj = [], temp = [];
	getSortedData = sortBy(getData, "name");
	uniqueNameObj = getSortedData.filter(function(value, index, self){
		if(!(self[index+1]!==undefined && self[index].name== self[index+1].name)){
			return value.name;
		}
	});
	getAllUniqueNames = uniqueNameObj.map(function(a) {return a.name;});
	for(var i =0 ; i<getAllUniqueNames.length ; i++){
		temp = getSortedData.filter(function(value){
			if(value.name === getAllUniqueNames[i]){
				return value;
			}
		});
		ArrOfAllSimiliarName.push(temp);
	}	
	for(var i =0 ; i<ArrOfAllSimiliarName.length ; i++){
		SortedAllElms.push(sortBy(ArrOfAllSimiliarName[i], 'lastChangeBid'));
	}
	return [SortedAllElms, ArrOfAllSimiliarName];
}

/* Function Name:	calMidPrice		
 *
 * This function is used to calculate midPrice of the last 30secs data.
 * 
 * @ArrOfAllSimiliarName {Array}				- Array of arrays containing data based on similar currency pair name.
 * 												 
 */
function calMidPrice(ArrOfAllSimiliarName){
	var MeanAndNameArr = [], obj = {}, mean = [], i;
	for(i =0 ; i<ArrOfAllSimiliarName.length ; i++){
		obj = {}; mean = [];
		mean=ArrOfAllSimiliarName[i].map(function(value, index, self) {
				return (value.bestBid + value.bestAsk)/2 ;
		});
		obj.name=ArrOfAllSimiliarName[i][0].name;
		obj.midVal=mean;
		MeanAndNameArr.push(obj);
		
	}
	return MeanAndNameArr;
}

/* Function Name:	displayTable		
 *
 * This function is used to display the table. It displays columns: "Name", "Current Best Ask Price", "Current Best Bid Price",
 * "Best Ask Price Last Changed", "Best Bid Last Changed", "Spark Lines" and then finally insert it into the html element having id "currencyTbody".
 * 
 * @finalSortedArray {Array}					- Array of objects contains data of each currency pair type with highest lastChnageBid.
 * @MeanAndNameArr {Array}						- Array of objects containing currency tow keys and values>1>Key:"name" Value:"Currency Pair name"
 *									     		 2>Key: "midVal" Value:"mid price of last 30 secs data"
 * @graphFlag {Boolean}							- This flag set to true after the 30 secs indicating that the graph will be drawn now for last 30 secs data.Values: 1>True 2>False 
 * 												 
 */
function displayTable(finalSortedArray, MeanAndNameArr, graphFlag) {
	var colName = '',colBestAsk = '',colBestBid = '',colLastChangeAsk = '',colLastChangeBid = '',printRows = '',sparkPrice = '', returnTbl;
	printRows = finalSortedArray.map(function(elem, index) {
		colName = "<tr id='sparkTr" + [index] + "'>" + "<td>" + finalSortedArray[index].name + "</td>";
		colBestAsk = "<td>" + finalSortedArray[index].bestAsk + "</td>";
		colBestBid = "<td>" + finalSortedArray[index].bestBid + "</td>";
		colLastChangeAsk = "<td>" + finalSortedArray[index].lastChangeAsk + "</td>";
		colLastChangeBid = "<td>" + finalSortedArray[index].lastChangeBid + "</td>";
		sparkPrice = "<td id='sparkPrice" + [index] + "'>" + "</td></tr>";
		return printRows = colName + colBestAsk + colBestBid + colLastChangeAsk + colLastChangeBid + sparkPrice;
	});
	document.getElementById("currencyTbody").innerHTML = printRows.join(""); //Writing rows and columns in html page.
	if(graphFlag === true){
		drawGraph(finalSortedArray, MeanAndNameArr);
	}
}


/* Function Name:	drawGraph
 *
 * This function is used to draw the graph in the last column of each row.This function is called after every 30 secs.
 *
 * @finalSortedArray {Array}					- Array of objects contains data of each currency pair type with highest lastChnageBid.
 *												  last 30 secs.
 * @MeanAndNameArr {Array}						- Array of objects containing currency tow keys and values>1>Key:"name" Value:"Currency Pair name"
 *												  2>Key: "midVal" Value:"mid price of last 30 secs data"
 *
 */
function drawGraph(finalSortedArray,MeanAndNameArr){
	var tempArr = [],result = [],indices = [],i ,tdId = '' ;
	tempArr = finalSortedArray.slice();
	tempArr = sortBy(tempArr , 'name');		
	indices = MeanAndNameArr.map(function(elem, index) {
		return index;
	});
	indices.sort(function(a, b) {
		return tempArr[b].lastChangeBid - tempArr[a].lastChangeBid;
	});
	result = MeanAndNameArr.map(function(elem, index) {
		return result[index]= MeanAndNameArr[indices[index]];
	 });
	MeanAndNameArr = result;
	for (i = 0; i < MeanAndNameArr.length; i++) {
		tdId = "sparkPrice" + [i];
		const exampleSparkline = document.getElementById(tdId);
		Sparkline.draw(exampleSparkline, MeanAndNameArr[i].midVal);
	}

}



/* Function Name:	getDataForTblDisplay
 *
 * This function is used to store each currency pair data with highest lastChnageBid value.
 *
 * @finalSortedArray {Array}					- Array of objects contains data of each currency pair type with highest lastChnageBid.
 *												  last 30 secs.
 * @MeanAndNameArr {Array}						- Array of objects containing currency tow keys and values>1>Key:"name" Value:"Currency Pair name"
 *												  2>Key: "midVal" Value:"mid price of last 30 secs data".
 *
 */
function getDataForTblDisplay(SortedAllElms){
	var finalSortedArray = [];
	finalSortedArray = SortedAllElms.map(function(arrInner){
		return arrInner[0];
	});
	finalSortedArray = sortBy(finalSortedArray, 'lastChangeBid');
	return finalSortedArray;
}


/* Function Name:	sortBy
 *
 * This function is used to sort the data based either on "currency pair" name or "lastChangeBid" value.
 *
 * @getData {Array}								- Array of objects contains data of currency pair coming from storm server.
 * @selectnCriteria {String}					- Value based on which sorting will occur.It can be 1> name or 2>lastChangeBid
 *
 */
function sortBy(getData, selectnCriteria){
	if(selectnCriteria === "name"){
		getData.sort(function(a, b) {
			return a.name.localeCompare(b.name);
		});
	}
	else if(selectnCriteria === "lastChangeBid"){
		getData.sort(function(a, b) {
			return b.lastChangeBid - a.lastChangeBid;
		});
	}
	return getData;
}


