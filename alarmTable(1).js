var timeoutStop = false;
/**
 * 告警颜色
 * key: 级别+类型
 */
var alarmColorObj = {};

var RowTemplate = {};

function alarmSort(e){
    var parm = $(e).attr('alarmParm');
    if(parm != 'recoverDate'){
        $('.overviewTotalNum').html(0);
        $('.overviewConfirmedNum').html(0);
        $('.overviewUnConfirmedNum').html(0);
        var winId = $(e).attr('tableid');
        for(var i in typeAlarmWin){
            if(winId == typeAlarmWin[i]){
                delete alarmCountObject[i];
            }
        }
        var datas = $("#"+winId).alarmTable('cache');
        var sortData = datas.sort(compare(parm));
        $("#"+winId).alarmTable('reload', sortData);
        $(e).parent().find('input[class=alarmCheckbox]').prop('checked', false);
    }
}

/**
 * 对象排序
 */
var compare = function (property){
    return function (a, b){
        var value1 = a[property];
        if(value1 instanceof Object){
            value1 = value1.time;
        }
        var value2 = b[property];
        if(value2 instanceof Object){
            value2 = value2.time;
        }
        if(!value1 || !value2){
            return;
        }
        if(typeof value1 == 'number' && typeof value2 == 'number'){
            return value2 - value1;
        } else{
            return value2.localeCompare(value1);
        }
    }
}

var tableCache = {};
var timeoutClear = {};
jQuery.fn.alarmTable = function (e, datas){
    var tableId = this.attr('id');
    if(!tableId){
        return;
    }
    var currData = tableCache[tableId];
    var tableDatas = [];
    var tableCols = {};
    var cachelimit = 0;
    if(currData){
        tableDatas = currData.data;
        tableCols = currData.cols;
        cachelimit = currData.limit;
    } else{
        tableCache[tableId] = {};
    }
    if(e instanceof Object){
        cachelimit = e.limit;
        tableDatas = [];
        this.html('');
        var tileTable = "<table class='alarmTitleTableClass'><thead><tr class='alarmTitleTr'>";
        if(e.checked){
            tableCache[tableId].checked = true;
            tileTable += "<td style='width: 24.5px;'><input class='alarmCheckbox' checkclass='check"+tableId+"' type='checkbox' onclick='alarmCheckAll(this)'></td>";
        } else{
            tableCache[tableId].checked = false;
        }
        var tdCount = 1;
        tableCols = {};
        e.cols.map(function (col){
            tableCols[tdCount] = col;
            var width = col.width+"";
            if(!width.endsWith("px")){
                width = width+"%";
            }
            tileTable += "<td onclick='alarmSort(this)' tableId='"+tableId+"' alarmParm='"+col.field+"' style='width: "+width+";' class='text il8n-title' language='"+col.title+"' languagetitle='"+col.title+"'>"+col.title+"</td>"
            tdCount++;
        });
        tileTable += "</thead><tbody class='alarmBodyTable' id='"+tableId+"Table'></tbody>";
        this.append(tileTable);
        tableCache[tableId].cacheMap = {};
        if(datas){
            datas.map(function (data){
                tableDatas.unshift(data);
                alarmTableaddBeforeRecover(data, $('#'+tableId+'Table'), tableCols, cachelimit, e.checked, tableId);
                eval(e.countFunction)('add', data, cachelimit, tableId, false);
                if(tableCache[tableId].data.length > cachelimit){
                    var delData = tableCache[tableId].data.splice(cachelimit, 1);
                    if(delData){
                        delete tableCache[tableId].cacheMap[delData[0].id];
                    }
                }
                tableCache[tableId].cacheMap[data.id] = data;
            });
        }
        tableCache[tableId].data = tableDatas;
        tableCache[tableId].cols = tableCols;
        tableCache[tableId].limit = cachelimit;
        tableCache[tableId].countFunction = e.countFunction;
    } else if(e == 'add'){
        if(datas && datas.causedCode > 0){
            var oldDatas = tableCache[tableId].data;
            for(var i=0; i<oldDatas.length; i++){
                var oldData = oldDatas[i];
                if(oldData.devId == datas.devId && oldData.alarmId == datas.alarmId && oldData.causedCode == datas.causedCode && oldData.modelVersionId == datas.modelVersionId){
                    return;
                }
            }
        }

        tableCache[tableId].data.unshift(datas);
        alarmTableaddBefore(datas, $('#'+tableId+'Table'), tableCache[tableId].cols, cachelimit, tableCache[tableId].checked, tableId);
        var ifAdd = true;
        if(tableCache[tableId].data.length > cachelimit){
            var delData = tableCache[tableId].data.splice(cachelimit, 1);
            if(delData){
                delete tableCache[tableId].cacheMap[delData[0].id];
                ifAdd = false;
            }
        }
        tableCache[tableId].cacheMap[datas.id] = datas;
        if(ifAdd){
            eval(tableCache[tableId].countFunction)('add', datas, tableCache[tableId].limit, tableId, true);
        } else{
            eval(tableCache[tableId].countFunction)('clear', datas, tableCache[tableId].limit, tableId, true);
        }
    } else if(e == 'addrecover'){
        if(datas && datas.causedCode > 0){
            var oldDatas = tableCache[tableId].data;
            for(var i=0; i<oldDatas.length; i++){
                var oldData = oldDatas[i];
                if(oldData.devId == datas.devId && oldData.alarmId == datas.alarmId && oldData.causedCode == datas.causedCode && oldData.modelVersionId == datas.modelVersionId){
                    return;
                }
            }
        }
        alarmTableaddBeforeRecover(datas, $('#'+tableId+'Table'), tableCache[tableId].cols, cachelimit, tableCache[tableId].checked, tableId);
        eval(tableCache[tableId].countFunction)('addrecover', datas, tableCache[tableId].limit, tableId, true);
        var currData = tableCache[tableId].cacheMap[datas.id];
        var index = tableCache[tableId].data.indexOf(currData);
        tableCache[tableId].data.splice(index, 1, datas);
        tableCache[tableId].cacheMap[datas.id] = datas;
    }else if(e == 'update'){
        if(!tableCache[tableId] || !tableCache[tableId].cacheMap || !tableCache[tableId].cacheMap[datas.id]){
            $('#'+tableId).alarmTable('addrecover', datas);
            return;
        }
        alarmUpdateWin(tableId, datas);
        eval(tableCache[tableId].countFunction)('update', datas, tableCache[tableId].limit, tableId, true);
        var currData = tableCache[tableId].cacheMap[datas.id];
        var index = tableCache[tableId].data.indexOf(currData);
        tableCache[tableId].data.splice(index, 1, datas);
        tableCache[tableId].cacheMap[datas.id] = datas;
        if(tableId != 'soeViewBody' && datas.status != 'ACKNOWLEDGEMENT'){
        	let sortDate = getSortDate(datas);
        	let oldMap = tableCache[tableId].cacheMap;
        	let dataArray = new Array();
        	for(var i in oldMap){
        		dataArray.push(getSortDate(oldMap[i]));
        	}
        	// 时间降序排序
        	dataArray.sort(function (x, y) {return y-x});
        	// 找出需要放入的位置
        	let index = dataArray.indexOf(sortDate);
        	if(index > 0){
        		$('#abnorAlarmViewBodyTable #'+datas.id).insertAfter($('#abnorAlarmViewBodyTable tr')[index-1]);
        	} else{
        		$('#abnorAlarmViewBodyTable #'+datas.id).insertBefore($('#abnorAlarmViewBodyTable tr')[0]);
        	}
        }
        $(e).parent().find('input[class=alarmCheckbox]').prop('checked', false);
    } else if(e == 'delete'){
        var confirmed = deleteAlarmWin(tableId, datas);
        if(!tableCache[tableId] || !tableCache[tableId].cacheMap){
            return;
        }
        var currData = tableCache[tableId].cacheMap[datas.id];
        if(!currData){
            return;
        }
        eval(tableCache[tableId].countFunction)('delete', datas, tableCache[tableId].limit, tableId, true, confirmed);
        var index = tableCache[tableId].data.indexOf(currData);
        tableCache[tableId].data.splice(index, 1);
        delete tableCache[tableId].cacheMap[datas.id];
    } else if(e == 'updateHeight'){
        $("#"+tableId+"Table").css('height', datas+"px");
    } else if(e == 'cache'){
        return tableCache[tableId].data;
    } else if(e == 'reload'){
        var ifTimeLoad = false;
        if(datas){
            tableCache[tableId].data = datas;
            ifTimeLoad = true;
        } else{
            datas = tableCache[tableId].data;
        }
        if(!datas){
            return;
        }
        $('#'+tableId+'Table').html('');
        var trs = '';
        var cols = tableCache[tableId].cols;
        var countFunc = tableCache[tableId].countFunction;
        var maxCount = tableCache[tableId].limit;
        //使用定时器，进行同步加载
        if(timeoutClear[tableId]){
            clearTimeout(timeoutClear[tableId]);
        }
        if(ifTimeLoad){
            timeoutClear[tableId] = setTimeout(function(){addAlarmTimeout(datas, tableId, tableCache[tableId].cols, cachelimit, tableCache[tableId].checked, maxCount, countFunc)}, 1);
        } else{
            addAlarmTimeout(datas, tableId, tableCache[tableId].cols, cachelimit, tableCache[tableId].checked, maxCount, countFunc);
        }
    } else if(e == 'updateLimit'){
        tableCache[tableId].limit = datas;
    } else if(e == 'clickedId'){
        var checkedAll = $('#'+tableId+'Table').find('input:checked');
        if(checkedAll && checkedAll.length > 0){
            var ids = [];
            checkedAll.map(function (e){
                ids.push($(checkedAll[e]).attr('alarmId'));
            });
            return ids;
        }
    } else if(e == 'reloadASC'){
        if(!datas){
            return;
        }
        $('#'+tableId+'Table').html('');
        var trs = '';
        var cols = tableCache[tableId].cols;
        var newDatas = [];
        for(var i=datas.length; i--; i>=0){
            newDatas.push(datas[i]);
            if(datas.countType){
                datas[i].countType = datas.countType;
            }
            alarmTableaddBeforeRecover(datas[i], $('#'+tableId+'Table'), tableCache[tableId].cols, cachelimit, tableCache[tableId].checked, tableId);
        }
        tableCache[tableId].data = newDatas;
    }
    scrollAutoWidth(tableId);
}

var addAlarmTimeout = function(datas, tableId, cols, cachelimit, checked, maxCount, countFunc){
    var tempdata =  datas.concat();
    var trs = "";
    var newData = datas;
    // if(tempdata.length > 10){
    // 	if(timeoutStop){
    // 		return;
    // 	}
    // 	newData = tempdata.splice(0, 10);
    // 	setTimeout(function (){
    // 		addAlarmTimeout(tempdata, tableId, cols, cachelimit, checked, maxCount, countFunc);
    // 	}, 1);
    // } else{
    // 	newData = tempdata;
    // }
    newData.map(function (reData){
        if(tempdata.countType){
            reData.countType = tempdata.countType;
        }
        trs = trs + alarmTableaddBeforeRecover(reData, $('#'+tableId+'Table'), cols, cachelimit, checked, tableId, true);
        if(!tableCache[tableId].cacheMap){
            tableCache[tableId].cacheMap = {};
        }
        tableCache[tableId].cacheMap[reData.id] = reData;
        if(countFunc){
            eval(countFunc)('add', reData, maxCount, tableId, true);
        }
    });
    $('#'+tableId+'Table').append(trs);
    if(timeoutClear[tableId]){
        clearTimeout(timeoutClear[tableId]);
    }

    if(checked){
        $('#'+tableId+'Table tr').css('cursor', 'pointer');
        $('#'+tableId+'Table tr').unbind();
        $('#'+tableId+'Table tr').click(function (){
            var checked = $(this).find('input').prop('checked');
            if(checked){
                $(this).find('input').prop('checked', false);
                $(this).css('background-color', '#000711');
            } else{
                $(this).find('input').prop('checked', true);
                $(this).css('background-color', '#0e254a');
            }
            var allTr = $(this.parentNode).find('tr');
            var checkAllTr = $(this.parentNode).find('tr input:checked');
            if(allTr.length == checkAllTr.length){
                getAllCheckElement($(this).find('input').attr('class')).prop('checked', true);
            } else{
                getAllCheckElement($(this).find('input').attr('class')).prop('checked', false);
            }
        });
    }
    scrollAutoWidth(tableId);
}

function deleteAlarmWin(tableId, data){
    var status = $('#'+tableId+' tr[id='+data.id+'] div[id=alarmConf]').attr('language');
    $('#'+tableId+' tr[id='+data.id+']').remove();
    if(status == 'Msg.fmmenu.noSure'){
        return 'unConfirmed';
    }
}

function alarmUpdateWin(tableId, data){
    var lev = data.severityId;
    if(data.status == 'ACKNOWLEDGEMENT' || data.status == 'CLEARED'){
        lev = 4;
    }
    var color = alarmColorObj[lev +""+ data.alarmType];
    if('OVERLIMIT' == data.overLimitType){
        // 越限特殊处理
        color = alarmColorObj[lev +""+ 25];
    }
    if(!color){
        color = '808080';
    }
    if(color){
        $('#'+tableId+' tr[id='+data.id+']').css('color', '#'+color);
        if(data.status != 'ACTIVE'){
            $('#'+tableId+' tr[id='+data.id+'] div[id=alarmConf]').attr('language', 'Msg.fmmenu.yesSure');
            $('#'+tableId+' tr[id='+data.id+'] div[id=alarmConf]').html(Msg.fmmenu.yesSure);
        }
    }
    if(data.recoverDate){
        var timelang = '';
        var timeStr = '';
        if(data.recoverDate instanceof Object){
            timelang = data.recoverDate.time;
            timeStr = getDate(data.recoverDate.time, null, null, parent.Cache.stationCache[data.stationCode]);
        } else{
            timelang = data.recoverDate;
            timeStr = getDate(data.recoverDate, null, null, parent.Cache.stationCache[data.stationCode]);
        }
        $('#'+tableId+' tr[id='+data.id+'] div[id=revDataDiv]').attr('timelang', timelang);
        $('#'+tableId+' tr[id='+data.id+'] div[id=revDataDiv]').html(timeStr);
    }
}

function getLevToNumber(str){
    if('Msg.fmlevel.importantlevel' == str){
        return 1;
    } else if('Msg.fmlevel.minor' == str){
        return 2;
    } else{
        return 3;
    }
}

function createTemplate(tableId,cols){
    var tr = "<tr id='{{id}}' style='color:#\{\{alarmColor\}\}'>";
    var checked = tableCache[tableId].checked;
    if(checked){
        tr += "<td style='width: 25px;'><input class='alarmCheckbox check"+tableId+"' alarmId='{{id}}' type='checkbox' onclick='clickChecked(this)'></td>";
    }
    for(var i in cols){
        var width = cols[i].width+"";
        if(!width.endsWith("px")){
            width = width+"%";
        }
        var field = cols[i].field;
        tr += "<td style='width: "+width+"'>{{"+field+"}}</td>";
    }
    tr += "</tr>";

    return tr;
}

function alarmTableaddBeforeRecover(data, tableElement, cols, cachelimit, checked, tableId, returnTr){
    var rowTemplate = RowTemplate[tableId];
    // 没有模板,创建模板
    if(!rowTemplate){
        rowTemplate = createTemplate(tableId,cols);
        RowTemplate[tableId] = rowTemplate;
    }
    for(var i in cols){
        var field = cols[i].field
        var repData = data[field];
        if(cols[i].exFun){
            repData = eval(cols[i].exFun)(data);
            if(repData instanceof Object){
                repData = repDate.val;
            }
        }
        if(!repData){
            repData = "";
        }
        var r = new RegExp("{{("+field+")}}",'g');
        rowTemplate = rowTemplate.replace(r, repData);
    }

    var alarmColor = 'ff0000';
    if(data.status != 'ACTIVE'){
        alarmColor = '808080';
    }
    if(data.alarmType && (data.perceivedSeverity || data.severityId || data.alarmLevel)){
        var lev = data.severityId;
        if(!lev){
            lev = data.alarmLevel;
        }
        if(!lev){
            lev = getLevToNumber(data.perceivedSeverity);
        }
        if(data.status == 'ACKNOWLEDGEMENT' || data.status == 'CLEARED' || data.status == 'RECOVERCLEARD'){
            lev = 4;
        }
        alarmColor = alarmColorObj[lev+''+data.alarmType];
    }
    if('OVERLIMIT' == data.overLimitType){
        // 越限特殊处理
        lev = data.severityId;
        if(data.status == 'ACKNOWLEDGEMENT' || data.status == 'CLEARED'){
            lev = 4;
        }
        alarmColor = alarmColorObj[lev +""+ 25];
    }
    var tr = rowTemplate.replace(/\{\{(alarmColor)\}\}/g, alarmColor);
    if(returnTr){
        return tr;
    }
    var befTr = tableElement.find('tr:first');
    if(befTr && befTr.length > 0){
        befTr.before(tr);
    } else{
        tableElement.append(tr);
    }
    var allTrs = tableElement.find('tr');
    if(allTrs.length > cachelimit){
        for(var i=cachelimit; i<allTrs.length; i++){
            if(tableElement.find('tr')[i]){
                tableElement.find('tr')[i].remove();
            }
        }
    }
    if(alarmColor){
        $('#'+tableId+' tr[id='+data.id+']').css('color', '#'+alarmColor);
        if(data.status != 'ACTIVE'){
            $('#'+tableId+' tr[id='+data.id+'] div[id=alarmConf]').attr('language', 'Msg.fmmenu.yesSure');
            $('#'+tableId+' tr[id='+data.id+'] div[id=alarmConf]').html(Msg.fmmenu.yesSure);
        }
    }
    if(data.recoverDate){
        var timelang = '';
        var timeStr = '';
        if(data.recoverDate instanceof Object){
            timelang = data.recoverDate.time;
            timeStr = getDate(data.recoverDate.time, null, null, parent.Cache.stationCache[data.stationCode]);
        } else{
            timelang = data.recoverDate;
            timeStr = getDate(data.recoverDate, null, null, parent.Cache.stationCache[data.stationCode]);
        }
        $('#'+tableId+' tr[id='+data.id+'] div[id=revDataDiv]').attr('timelang', timelang);
        $('#'+tableId+' tr[id='+data.id+'] div[id=revDataDiv]').html(timeStr);
    }
    if(checked && tableElement.find('tr') && tableElement.find('tr').length > 0){
        $(tableElement.find('tr')[0]).css('cursor', 'pointer');
        $(tableElement.find('tr')[0]).unbind();
        $(tableElement.find('tr')[0]).click(function (){
            var checked = $(this).find('input').prop('checked');
            if(checked){
                $(this).find('input').prop('checked', false);
                $(this).css('background-color', '#000711');
            } else{
                $(this).find('input').prop('checked', true);
                $(this).css('background-color', '#0e254a');
            }
            var allTr = $(this.parentNode).find('tr');
            var checkAllTr = $(this.parentNode).find('tr input:checked');
            if(allTr.length == checkAllTr.length){
                getAllCheckElement($(this).find('input').attr('class')).prop('checked', true);
            } else{
                getAllCheckElement($(this).find('input').attr('class')).prop('checked', false);
            }
        });
    }
}

function alarmTableaddBefore(data, tableElement, cols, cachelimit, checked, tableId, returnTr){
    var alarmColor = 'ff0000';
    if(data.status != 'ACTIVE'){
        alarmColor = '808080';
    }
    if(data.alarmType && (data.perceivedSeverity || data.severityId || data.alarmLevel)){
        var lev = data.severityId;
        if(!lev){
            lev = data.alarmLevel;
        }
        if(!lev){
            lev = getLevToNumber(data.perceivedSeverity);
        }
        if(data.status == 'ACKNOWLEDGEMENT' || data.status == 'CLEARED'){
            lev = 4;
        }
        alarmColor = alarmColorObj[lev+''+data.alarmType];
    }
    if('OVERLIMIT' == data.overLimitType){
        // 越限特殊处理
        lev = data.severityId;
        if(data.status == 'ACKNOWLEDGEMENT' || data.status == 'CLEARED'){
            lev = 4;
        }
        alarmColor = alarmColorObj[lev +""+ 25];
    }
    var tr = "<tr id='"+data.id+"' style='color:#"+alarmColor+"'>";
    if(checked){
        tr += "<td style='width: 25px;'><input class='alarmCheckbox check"+tableId+"' alarmId='"+data.id+"' type='checkbox' onclick='clickChecked(this)'></td>";
    }
    for(var i in cols){
        var width = cols[i].width+"";
        if(!width.endsWith("px")){
            width = width+"%";
        }
        var repDate = data[cols[i].field];
        if(cols[i].exFun){
            repDate = eval(cols[i].exFun)(data);
            if(repDate instanceof Object){
                repDate = repDate.val;
            }
        }
        if(!repDate){
            repDate = "";
        }
        tr += "<td style='width: "+width+"'>"+repDate+"</td>";
    }
    tr += "</tr>";
    if(returnTr){
        return tr;
    }
    var befTr = tableElement.find('tr:first');
    if(befTr && befTr.length > 0){
        befTr.before(tr);
    } else{
        tableElement.append(tr);
    }
    var allTrs = tableElement.find('tr');
    if(allTrs.length > cachelimit){
        for(var i=cachelimit; i<allTrs.length; i++){
            if(tableElement.find('tr')[i]){
                tableElement.find('tr')[i].remove();
            }
        }
    }
    if(checked && tableElement.find('tr') && tableElement.find('tr').length > 0){
        $(tableElement.find('tr')[0]).css('cursor', 'pointer');
        $(tableElement.find('tr')[0]).unbind();
        $(tableElement.find('tr')[0]).click(function (){
            var checked = $(this).find('input').prop('checked');
            if(checked){
                $(this).find('input').prop('checked', false);
                $(this).css('background-color', '#000711');
            } else{
                $(this).find('input').prop('checked', true);
                $(this).css('background-color', '#0e254a');
            }
            var allTr = $(this.parentNode).find('tr');
            var checkAllTr = $(this.parentNode).find('tr input:checked');
            if(allTr.length == checkAllTr.length){
                getAllCheckElement($(this).find('input').attr('class')).prop('checked', true);
            } else{
                getAllCheckElement($(this).find('input').attr('class')).prop('checked', false);
            }
        });
    }
}

var getSeverityId = function (e){
    var severityId = e.severityId;
    if(!severityId){
        if(!e.perceivedSeverity){
            severityId = e.alarmLevel;
        } else{
            severityId = getLevToNumber(e.perceivedSeverity);
        }
    }
    if(!e.alarmType && e.ifSoe == 1){
        severityId = 1;
    }
    var data = {};
    if(severityId == '1'){
        data.lang = 'Msg.fmlevel.importantlevel';
    } else if(severityId == '2'){
        data.lang = 'Msg.fmlevel.minor';
    } else{
        data.lang = 'Msg.fmlevel.prompt';
    }
    data.val = eval(data.lang);
    return '<div class="text" language="'+data.lang+'">'+data.val+'</div>';
}

var getIfstatus = function (e){
    var data = {};
    if(e.status == 'ACKNOWLEDGEMENT' || e.status == 'CLEARED' || e.status == 'RECOVERCLEARD'){
        data.lang = 'Msg.fmmenu.yesSure';
    } else{
        data.lang = 'Msg.fmmenu.noSure';
    }
    data.val = eval(data.lang);
    return '<div class="text" id="alarmConf" language="'+data.lang+'">'+data.val+'</div>';
}

var getRaisedDate = function(e){
    var match = null;
    var timelang = '';
    var timeStr = '';
    if(e.raisedDate instanceof Object){
        timelang = e.raisedDate.time;
        timeStr = getDate(e.raisedDate.time, null, match, parent.Cache.stationCache[e.stationCode]);
    } else{
        timelang = e.raisedDate;
        timeStr = getDate(e.raisedDate, null, match, parent.Cache.stationCache[e.stationCode]);
    }
    if(e.ifSoe == 1 && e.soeName){
        var tempDate = new Date(timelang);
        var milliseconds = formatDatePreZero(tempDate.getMilliseconds(), 3);
        timeStr = timeStr+ ' ' +milliseconds;
    }
    return '<div class="timelang" timelang="'+timelang+'">'+timeStr+'</div>';
}

var getSystemDate = function(e){
    var match = null;
    var timelang = '';
    var timeStr = '';
    if(e.systemDate == null){
        return '<div class="timelang" timelang="'+timelang+'">'+timeStr+'</div>';
    }
    if(e.systemDate instanceof Object){
        timelang = e.systemDate.time;
        timeStr = getDate(e.systemDate.time, null, match, parent.Cache.stationCache[e.stationCode]);
    } else{
        timelang = e.systemDate;
        timeStr = getDate(e.systemDate, null, match, parent.Cache.stationCache[e.stationCode]);
    }
    if(e.ifSoe == 1 && e.soeName){
        var tempDate = new Date(timelang);
        var milliseconds = formatDatePreZero(tempDate.getMilliseconds(), 3);
        timeStr = timeStr+ ' ' +milliseconds;
    }
    return '<div class="timelang" timelang="'+timelang+'">'+timeStr+'</div>';
}

var formatDatePreZero = function (time, zeroNum) {
    time += "";
    while (time.length < zeroNum) {
        time = "0" + time;
    }
    return time;
}

var getRecoverDate = function(e){
    if(!e.recoverDate){
        return '<div class="timelang" timelang="" id="revDataDiv"></div>';
    }
    var timelang = '';
    var timeStr = '';
    if(e.recoverDate instanceof Object){
        timelang = e.recoverDate.time;
        timeStr = getDate(e.recoverDate.time, null, null, parent.Cache.stationCache[e.stationCode]);
    } else{
        timelang = e.recoverDate;
        timeStr = getDate(e.recoverDate, null, null, parent.Cache.stationCache[e.stationCode]);
    }
    return '<div class="timelang" timelang="'+timelang+'" id="revDataDiv">'+timeStr+'</div>';
}

function alarmCheckAll(e){
    var cls = $(e).attr('checkClass');
    if(e.checked){
        $('.'+cls).prop("checked", true);
        $(e).parent().parent().parent().next().find('tr').css('background-color', '#0e254a');
        $(e).parent().parent().parent().next().find('tr input').prop("checked", true);
    } else{
        $('.'+cls).prop("checked", false);
        $(e).parent().parent().parent().next().find('tr').css('background-color', '#000711');
        $(e).parent().parent().parent().next().find('tr input').prop("checked", false);
    }
}

function clickChecked(e){
    if(e.checked){
        e.checked = false;
    } else{
        e.checked = true;
    }
}

function getAllCheckElement(checkClass){
    var names = checkClass.split(" ");
    var checkAll;
    names.map(function (e){
        checkAll = $('input[type=checkbox][checkclass='+e+']');
        if(checkAll && checkAll.length > 0){
            return checkAll;
        }
    });
    return checkAll;
}

var setAlarmDevName = function(e){
    var devName = e.devName;
    if(!devName){
        devName = e.alarmObject;
    }
    var devlang = "";
    if(devName == "电站监控系统虚拟设备"){
        devName = Msg.devType.virtualDev;
        devlang= 'Msg.devType.virtualDev';
    }
    var lev = e.severityId;
    if(!lev){
        lev = e.alarmLevel;
    }
    if(e.status == 'ACKNOWLEDGEMENT' || e.status == 'CLEARED'){
        lev = 4;
    }
    var color = alarmColorObj[lev +""+ e.alarmType];
    if('OVERLIMIT' == e.overLimitType){
        // 越限特殊处理
        color = alarmColorObj[lev +""+ 25];
    }
    if(!color){
        if(e.status == 'ACTIVE'){
            color = 'ff0000';
        } else{
            color = '808080';
        }
    }
    var alarmName = e.name;
    if(!alarmName){
        alarmName = e.soeName || e.alarmName;
    }
    return '<span class="clickable-text text" stationCode="'+e.stationCode+'" busiCode="'+toHexTostr(e.busiCode)+'" alarmColor="'+color+'" alarmId="'+e.id+'" language="'+devlang+'" alarmName="'+alarmName+'" onclick="devJumpFind(this)">'+toHexTostr(devName)+'</span>';
}

function toHexTostr(unicodestr){
    try{
        if(unicodestr){
            unicodestr = unicodestr.replace(/\\/g, "%");
            return unescape(unicodestr);
        }
        return "";
    } catch (e) {
        return unicodestr;
    }
}

function strToUnicode(str){
    try{
        if(str){
            var code = '';
            for(var i=0; i<str.length; i++){
                var charCode = str.charCodeAt(i).toString(16);
                if(charCode.length < 4){
                    charCode = addStr(4 - charCode.length) + charCode;
                }
                code += charCode;
            }
            return code;
        }
        return "";
    } catch (e) {
        return str;
    }
}

function addStr(length){
    var str = '';
    for(var i=0; i<length; i++){
        str += '0';
    }
    return str;
}

function devJumpFind(e){
    var stationCode = $(e).attr('stationCode');
    var busiCode = $(e).attr('busiCode');
    var alarmId = $(e).attr('alarmId');
    var mycolor = $(e).attr('alarmColor');
    var alarmType = $('.alarmWinBtn1').attr('alarmType');
    if(!alarmType){
        alarmType = $(e).attr('alarmType');
    }
    $.omcAjax("/fmFloat/devJumpFind", {
        'stationCode': stationCode,
        'busiCode': strToUnicode(busiCode),
        'alarmId': alarmId,
        'alarmType': alarmType
    }, function (res) {
        if(res.data){
            var subAreaId = res.data.subAreaId;
            var subMatrixId = res.data.subMatrixId;
            var devid = res.data.devid;
            if(!subAreaId) {
                App.myMsg(Msg.FM.deviceNotInInterval);
                return;
            }
            var message = res.data.alarmName;
            if(!message){
                message = $(e).attr('alarmName');
            }
            var selectedStation = $('#stationsSelects');
            var option;
            if(!selectedStation || selectedStation.length < 1){
                option = $(window.frames["mainFrame"].document).find("select[id=stationsSelects]").find("option[value='"+stationCode+"']");
            } else{
                option = selectedStation.find("option[value='"+stationCode+"']");
            }
            if(res.data.ip && option.attr("type") && option.attr("type") == 'COMC_STATION'){
                if(mycolor.startsWith("#")){
                    mycolor = mycolor.substring(1, mycolor.length);
                }
                //跳转其它站控
                var sendUrl = option.attr("sendurl");
                var secondUrl = option.attr("sendurl2");
                // if(interval){
                // }
                message = encodeURIComponent(message);
                ssoJump(stationCode,sendUrl,secondUrl,3,subAreaId,subMatrixId,devid,mycolor,message);
            } else{
                //本地跳转
                if(subMatrixId){
                    var hurl = omc.dmodmenu.defPage.url;
                    if(hurl.indexOf('?')<0){
                        hurl = hurl+"?v="+parent.omc.defaultcode + new Date().getTime();
                    }
                    var lastSubAreaId = $("#mainFrame").contents().find('body').find('#mySelect1').val();
                    var lastSubMatrixId = $("#mainFrame").contents().find('body').find('#mySelect2').val();
                    if (lastSubAreaId == subAreaId && lastSubMatrixId == subMatrixId) {
                        if(!mycolor.startsWith("#")){
                            mycolor = '#'+mycolor;
                        }
                        mainFrame.window.highLight(devid, message, mycolor);
                        return;
                    }
                    parent.hideAlarmWin();
                    var url = hurl + '&subId=' + subAreaId + "&invId=" + subMatrixId + "&devId=" + devid + "&mycolor=#" + mycolor + "&message=" + message;
                    var oldUrl = $("#mainFrame").attr('src');
                    if(url == oldUrl){
                        var urlArray = url.split("?v=");
                        if(urlArray.length > 1){
                            var str = urlArray[1].split("&")[0];
                            var number = str.length;
                            // src未更新不会触发跳转操作，修改固定字符（修改问题子阵分图点击跳转后切换子阵，再次点击跳转无效）
                            if(str == "sdafsaf"){
                                str = "sdafsa";
                            } else{
                                str = "sdafsaf";
                            }
                            url = urlArray[0] + "?v=" + str +urlArray[1].substring(number, urlArray[1].length);
                        }
                    }
                    $("#mainFrame").attr('src', url);
                } else{
                    var hurl = omc.fqztmenu.defPage.url;
                    if(hurl.indexOf('?')<0){
                        hurl = hurl+"?v="+parent.omc.defaultcode;
                    }
                    $("#mainFrame").attr('src', hurl + '&subId=' + subAreaId + "&devId=" + devid + "&mycolor=" + mycolor + "&message=" + message);
                }
            }
        } else{
            parent.App.myMsg(Msg.FM.devNotExist);
        }
    });

    function ssoJump(stationCode,sendUrl,secondUrl,destination,subAreaId,subMatrixId,devId,mycolor,message){
        if(!sendUrl && !secondUrl){
            App.myMsg(Msg.rwmenu.centralized.stationConfig.notSettingUrl);
            return;
        }
        var ssourl = omc.sso.url;
        if(ssourl.indexOf('?')<0){
            ssourl = ssourl+"?v="+parent.omc.defaultcode;
        }
        if(!parent.isDNDM){
            window.open(window.location.protocol+"//"+sendUrl+ssourl+"&prefer_Lang="+parent.Cookies.get("typeValGlob")+"&Referer="+"COMC&sid="+stationCode+"&destination="+destination+ "&subId=" + subAreaId + "&subAreaId=" + subMatrixId + "&devId=" + devId + "&mycolor=" + mycolor + "&message=" + message,'_self');
        }else{
            //双网双机需要先跨域请求测试是否能访问
            $.ajax({
                url:window.location.protocol+"//"+sendUrl+"/heartbeat/checkStatus",
                dataType:'jsonp',
                data:'',
                jsonp:'callback',
                jsonpCallback:"callback",
                success:function(json) {
                    if(json.success){
                        window.open(window.location.protocol+"//"+sendUrl+ssourl+"&prefer_Lang="+parent.Cookies.get("typeValGlob")+"&Referer="+"COMC&sid="+stationCode+"&destination="+destination+ "&subId=" + subAreaId + "&subAreaId=" + subMatrixId + "&devId=" + devId + "&mycolor=" + mycolor + "&message=" + message,'_self');
                    }else{
                        checkNetState(secondUrl, window.location.protocol+"//"+secondUrl+ssourl+"&prefer_Lang="+parent.Cookies.get("typeValGlob")+"&Referer="+"COMC&sid="+stationCode+"&destination="+destination+ "&subId=" + subAreaId + "&subAreaId=" + subMatrixId + "&devId=" + devId + "&mycolor=" + mycolor + "&message=" + message);
                    }
                },
                error: function(jqXHR, textStatus){
                    checkNetState(secondUrl, window.location.protocol+"//"+secondUrl+ssourl+"&prefer_Lang="+parent.Cookies.get("typeValGlob")+"&Referer="+"COMC&sid="+stationCode+"&destination="+destination+ "&subId=" + subAreaId + "&subAreaId=" + subMatrixId + "&devId=" + devId + "&mycolor=" + mycolor + "&message=" + message);
                },
                timeout:2000
            });
        }
    }
}

function checkNetState(ip, url){
    $.ajax({
        url:window.location.protocol+"//"+ip+"/heartbeat/checkStatus",
        dataType:'jsonp',
        data:'',
        jsonp:'callback',
        jsonpCallback:"callback",
        success:function(json) {
            if(json.success){
                window.open(url,'_self');
            }else{
                App.myMsg(Msg.stationStatus.networkError);
            }
        },
        error: function(jqXHR, textStatus){
            App.myMsg(Msg.stationStatus.networkError);
        },
        timeout:2000
    });
}

/**
 * 通过高度判断显示滚动条时，缩短thead的宽度
 * @param num
 */
function scrollAutoWidth(tableId){
    if(!$("#"+tableId+" .alarmTitleTableClass tbody")[0]){
        return;
    }
    var offsetHeight = $("#"+tableId+" .alarmTitleTableClass tbody")[0].offsetHeight;
    var scrollHeight = $("#"+tableId+" .alarmTitleTableClass tbody")[0].scrollHeight;
    if(scrollHeight > offsetHeight){
        $("#"+tableId+" .alarmTitleTableClass thead").attr("style", "width:calc( 100% - 17px );");
    }else{
        $("#"+tableId+" .alarmTitleTableClass thead").attr("style", "width:100%;");
    }
}

var getSortDate = function (data){
	if(data){
		var raiData = data.raisedDate;
        if(raiData instanceof Object){
        	raiData = raiData.time;
        }
        var recDate = data.recoverDate;
        if(recDate instanceof Object){
        	recDate = recDate.time;
        }
        if(recDate){
        	return raiData > recDate ? raiData:recDate;
        }
        return raiData;
	}
}