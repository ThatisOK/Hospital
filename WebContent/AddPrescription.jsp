<%@ page language="java" contentType="text/html; charset=UTF-8"
    pageEncoding="UTF-8"%>
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<!-- 新 Bootstrap 核心 CSS 文件 -->
<link rel="stylesheet" href="static/css/bootstrap.min.css">
<link rel="stylesheet" href="static/css/flat-ui.css">
<!-- jQuery文件。务必在bootstrap.min.js 之前引入 -->
<script src="static/js/jquery.min.js"></script>
<script src="static/js/jQuery.md5.js"></script>
<script type="text/javascript" src="static/js/flat-ui.min.js"></script>
<script type="text/javascript" src="static/js/application.js"></script>
<!-- 最新的 Bootstrap 核心 JavaScript 文件 -->
<script src="static/js/bootstrap.min.js"></script>
<link rel="stylesheet" href="static/css/css.css">
<script type="text/javascript" src="static/js/quantity.js"></script>
<style>
body{ 
	text-align:center
	} 
#medicineDiv{
	margin:0 auto;
	}

#addUser{
	position:relative;
	left:-30px;
}

.select{
	left: -80px;
    position: relative;
    top: -40px;
}



#select-label{
	position: relative;
    left: -200px;
}

.form-control {
    width: 120px;
    height: 35px;

}


#name-label {
    position: relative;
    left: -80px;
}
#name {
    position: relative;
    left: -130px;
    width: 100px;
}

#sum-label {
    left: 20px;
    position: relative;
    top: 1px;
}
#sum {
    left: 30px;
    position: relative;
    height: 42px;
    top: 1px;
}
#medicine{
	height:42px;
}
#sum{
 	position: relative;
    left: 15px;
    width: 70px;
}

#age {
    width: 60px;
    position: relative;
    left: -250px;
}
#ages {
   	left: -250px;
    position: relative;
}

#age_label{
	position: relative;
    left: -200px;	
}
#diagnose-label{
	position: relative;
    left: -280px;
	
}
#diagnose{
	position: relative;
    left: -330px;

}
#allergic-label {
    position: relative;
    left: -250px;
}
#allergic {
    left: -180px;
    position: relative;
    top: -40px;
}
#address {
    left: -53px;
    position: relative;
    top: -39px;
    width: 240px;
}
#address-label {
    left: -113px;
    position: relative;
    top: 2px;
}
#signOut {
    position: relative;
    top: -3px;
    left: 80px;
}

#medicineTable{
}
.select2-choice{
	width: 100px;
    position: relative;
    left: -60px;
}

.select2-display-none{
	width: 100px !important;
}

.table > tbody > tr > td{
    vertical-align: middle;
}
</style>

<title>新处方</title>
</head>
<body background="static/img/background.jpg">
		<% 
			String userid = "";
	        if (session.getAttribute("userid") == null) {
	    %>
	    <script type="text/javascript">
			alert("您还没有登录，请登录...");
			window.location.href = "SignIn.html";
		</script>
		<%
	        }else{
				userid = (String) session.getAttribute("userid");	
			}
		%>
	<form class="form-inline">
	<input id="res" name="res" type="reset" style="display:none;" />  
	<input type="hidden" class="form-control" id="userid" val=<%=userid %>>  
	<div class="container-fluid" style="margin:3% 0 0 8%">
		<div class="row">
			<div class="col-md-1">
				<label for="exampleInputName2" id="name-label">姓名：</label>
			</div>
			<div class="col-md-1">
		    	<input type="text" class="form-control" id="name"  >
			</div>
			<div class="col-md-2">
				<label for="exampleInputName2" id="select-label">性别：</label>
				<select id="select" data-toggle="select" class=" select select-primary mrs mbm">
			        <option id="m">男</option>
			        <option id="d">女</option>
		    	</select>
			</div>
			<div class="col-md-1">
				<label for="exampleInputName2" id="age_label">年龄：</label>
			</div>
			<div class="col-md-1">
	    		<input type="text" class="form-control" id="age" maxNum="100" >
	    		<label for="exampleInputName2" id="ages">岁</label>
			</div>
			<div class="col-md-1">
				<label for="exampleInputName2" id="diagnose-label">诊断：</label>
			</div>
			<div class="col-md-1">
	    		<input type="text" class="form-control" id="diagnose" >
			</div>
			<div class="col-md-1">
				<label for="exampleInputName2"  id="allergic-label">过敏史：</label>
				<input type="text" class="form-control" id="allergic" >
			</div>
			<div class="col-md-1">
	    		<label for="exampleInputName2"  id="address-label">地址：</label>
				<input type="text" class="form-control" id="address" >
			</div>
			<div class="col-md-1">
				<button type="button" class="btn btn-link"  id="signOut">退出</button>
			</div>
		</div>
	</div>
	
	<table class="table table-bordered" id="medicineTable">
		<tr>
			<td>药品</td>
			<td>厂家</td>
			<td>规格</td>
			<td>单价</td>
			<td>数量</td>
			<td>操作</td>
		</tr>
	</table>
	<div id="medicineDiv">
		
		<div class="input-group">
			<input class="form-control" id="medicine" type="search" placeholder="搜索药品"> 
			<span class="input-group-btn">
				<button type=button class="btn" id="search">
					<span class="fui-search"></span>
				</button>
			</span>
		</div>	
		<button type="button" class="btn btn-primary" id="complete">完成</button>
		<label for="exampleInputName2"  id="sum-label">总价：</label>
		<input type="text" class="form-control" id="sum" placeholder="0.0元">
	</div>
	</form>	
	<div class="modal fade bs-example-modal-lg" tabindex="-1" role="dialog" aria-labelledby="myLargeModalLabel" id="myModal">
		  <div class="modal-dialog modal-lg">
		   <div class="modal-content" id="jsontotable">
			   	<table class="table table-bordered" >
					<tr id="header">
						<td>选择</td>
						<td>药品</td>
						<td>厂家</td>
						<td>规格</td>
						<td>单价</td>
					</tr>
				</table>
			   	<button type="button" class="btn btn-primary" id="confirm" data-dismiss="modal">确定</button>
			   	<button type="button" class="btn btn-primary" id="cancel" data-dismiss="modal">取消</button>
			</div>
		  </div>
	</div>
	<div class="modal fade bs-example-modal-sm" tabindex="-1" role="dialog" aria-labelledby="mySmallModalLabel">
		  <div class="modal-dialog modal-sm">
		    <div class="modal-content">
		      <div class="modal-body">
        		<form class="form-horizontal">
					  <div class="form-group">
					    <label for="inputEmail3" class="col-sm-3 control-label">姓名</label>
					    <div class="col-sm-9">
					      <input type="text" class="form-control" id="inputNewName" placeholder="姓名">
					    </div>
					  </div>
					  <div class="form-group">
					    <label for="inputPassword3" class="col-sm-3 control-label">密码</label>
					    <div class="col-sm-9">
					      <input type="text" class="form-control" id="inputNewPassword" placeholder="密码">
					    </div>
					  </div>
				</form>
		      </div>
		      <div class="modal-footer">
		        <button type="button" class="btn btn-primary" id="ok">确定</button>
		        <button type="button" class="btn btn-default" data-dismiss="modal">关闭</button>
		      </div>

		    </div>
	  	</div>
	</div>
</body>
<script>
	$("#medicine").bind('keypress',function(event){
		if(event.keyCode == "13"){
			$('#jsontotable').find('tr').first().nextAll().remove();
			var name = $("#medicine").val();
			if(name != ""){
				$.ajax({
					url : "MedicineServlet",
					data : {
						name : name,
						operation : "search"
					},
					type : 'post',
					dataType : 'json',
					success : function(data) {
						if(data.error != "error" ){
							$('#myModal').modal('show');
							$.each(data, function(i, n){
								var tr = $('#jsontotable').find('tr').last();
								tr.after("<tr><td><div class=\"checkbox\"><label><input type=\"checkbox\"  id="+ n["id"] +"></label></div>" +"</td><td>"+ n['name'] + "</td><td>" + n['brand'] + " </td><td> " + n['standard'] + "</td><td> " + n['price'] + "</td></tr>");
								});
							
						}
						else{
							alert("没有药品");
						}
						
					}

				});
			}else{
				alert("请输入药品名称");
			}
			
		}   
	})
	$("#search").click(function(){
		$('#jsontotable').find('tr').first().nextAll().remove();
		var name = $("#medicine").val().toUpperCase();
		if(name != ""){
			$.ajax({
				url : "MedicineServlet",
				data : {
					name : name,
					operation : "search"
				},
				type : 'post',
				dataType : 'json',
				success : function(data) {
					if(data.error != "error" ){
						$('#myModal').modal('show');
						$.each(data, function(i, n){
							var tr = $('#jsontotable').find('tr').last();
							tr.after("<tr><td><div class=\"checkbox\"><label><input type=\"checkbox\" id="+ n["id"] +"></label></div>" +"</td><td>"+ n['name'] + "</td><td>" + n['brand'] + " </td><td> " + n['standard'] + "</td><td> " + n['price'] + "</td></tr>");
							});
						
					}else{
						alert("没有药品");
					}
				}

			});
		}else{
			alert("请输入药品名称");
		}
		
	})
 
	
	$("#confirm").click(function(){
		var result = "";
		 $("input[type='checkbox']:checked").each(function () {
			result = result + $(this).attr("id") +";";
         });
		$.ajax({
			url : "MedicineServlet",
			data : {
				data : result,
				operation : "confirm"
			},
			type : 'post',
			dataType : 'json',
			success : function(data) {
				var sum = $("#sum").val()*1;
				$.each(data, function(i, n){
					var str = "<div class='num-box fl'><a href='javascript:;'id="+n['id']+" class='num-add fr'>+</a><a href='javascript:;' id="+n['id']+" class='num-cut fl num-lose'>-</a><span class='num-number'>1</span></div>";
					var tr = $('#medicineTable').find('tr').last();
					tr.after("<tr id="+n['id']+"><td>"+ n['name'] + "</td><td>" + n['brand'] + " </td><td>" + n['standard'] + " </td><td id='price'> " + n['price'] + "</td><td> " + str + "</td><td><button type='button' class='btn btn-link' name="+n['id']+" id='deleteMedicine'>删除</button> </td></tr>");
					sum += n['price']*1; 
				})
				$("#sum").val(sum.toFixed(2));
			}
		})
		
	})
	
	$("#complete").click(function(){
		var id =  $("#userid").attr("val");
		if(id == ""){
			alert("请重新登陆");
			window.location.href = "SignIn.html";
		}
		var name = $("#name").val();
		var sex = $("#select2-chosen-1").text();
		var age = $("#age").val();
		var diagnose = $("#diagnose").val();
		var allergic = $("#allergic").val();
		var address = $("#address").val();
		var sum = $("#sum").val();
		var medicine =$("#medicineTable").find('td').last();
		var result = '';
		$("#medicineTable tr").each(function(index){
			if(index != 0){
				var id=$(this).attr('id');
			   	var num = $(this).find('span').text();
			   	result += id+':'+num+":";
			} 
		})
		
		if(medicine.html()=="数量"){
			alert("请选择药品");
		}
		else if(name !="" && age !="" && diagnose !="" && allergic !="" && address !=""){
			$.ajax({
				url : "PrescriptionServlet",
				data : {
					userid : id,
					name:name,
					sex:sex,
					age:age,
					diagnose:diagnose,
					allergic:allergic,
					address:address,
					sum:sum,
					medicine_list:result.slice(0,-1),
					operation : "add"
				},
				type : 'post',
				dataType : 'json',
				success : function(data) {
					$("input[type=reset]").trigger("click");
					$("#sum").val("");
					$("#medicine").val("");
					$('#medicineTable').find('tr').first().nextAll().remove();
					alert("保存成功");
				}
			})
		}else{
			alert("请正确填写信息");
		}
		
	})
	

	$("#age").keyup(function(){
	    CheckNum($(this));
	}).bind("paste", function () {
	    CheckNum($(this));
	}).css("ime-mode", "disabled");

	function CheckNum(obj) { //验证整数
	    obj = jQuery(obj);
	    var tmptxt = obj.val().replace(/[^0123456789.]|^/g, '');  //利用正则表达式
	    if(tmptxt != obj.val()){
	    	alert("请输入正确的年龄");
	    	obj.val(tmptxt);
	    	return;
	    }
	    var maxNum = jQuery.trim(obj.attr("maxNum")); //最大值
	    if (maxNum) {
	        if (parseInt(maxNum) >= parseInt(tmptxt)) {
	            obj.val(tmptxt);
	        }
	        else {
	        	alert("请输入正确的年龄");
	            obj.val("");
	        }
	        return;
	    }
	    obj.val(tmptxt);
	}
	
	$("#ok").click(function(){
		var name = $("#inputNewName").val();
		var password = $("#inputNewPassword").val();
		$.ajax({
			url : 'UserServlet',
			data:{
				username:name,
				password:password,
				operation:"signUp"
			},
			type : 'post',
			dataType : 'json',
			success :function(data){
				alert(data['errMsg']);
				$('.bs-example-modal-sm').modal('hide');
			}
		})
	})
	
	$("#signOut").click(function(){
		$.ajax({
			url : 'UserServlet',
			data:{
				operation:"signOut"
			},
			type : 'post',
			dataType : 'json',
			success :function(data){
				window.location.href = "SignIn.html";
			}
		})
	})
	
	$(function() {
        quantity = $('.num-box').quantity({
            cutBtn: '.num-cut',
            addBtn: '.num-add',
            numBox: '.num-number',
            msgBox: '.det-msg'
        });
    });
	$('#medicineTable').on('click', '.num-add', function(e) {
		var num = $(this).parent().find('.num-number');
		$(this).parent().find('.num-cut').attr("class", "num-cut fl");
		var sum = $("#sum").val() * 1;
		var price = $(this).parent().parent().parent().find('#price').text() * 1;
		sum += price;
		$("#sum").val(sum.toFixed(2));
		num.text(parseInt(num.text())+1)		
	})
	$('#medicineTable').on('click', '.num-cut', function(e) {
		var num = $(this).parent().find('.num-number');
		if(parseInt(num.text()) == 1){
			$(this).parent().find('.num-cut').attr("class", "num-cut fl num-lose");
		}else{
			var sum = $("#sum").val() * 1;
			var price = $(this).parent().parent().parent().find('#price').text() * 1;
			sum -= price;
			$("#sum").val(sum.toFixed(2));
			num.text(parseInt(num.text())-1)	
		}
			
	})
	
	$('#medicineTable').on('click', '#deleteMedicine', function(e) {
		if(confirm("确认删除？")){
			var price = $(this).parent().parent().parent().find('#price').text() * 1;
			var num = $(this).parent().parent().find('span').text()*1;
			var sum = $("#sum").val()*1;
			sum = sum-num*price
			$("#sum").text(sum.toFixed(2));
			$(this).parent().parent().remove();
		}
	})
	
</script>
</html>