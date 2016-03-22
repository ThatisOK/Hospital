<%@ page language="java" contentType="text/html; charset=UTF-8"
	pageEncoding="UTF-8"%>
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<link rel="stylesheet" href="static/css/admin.css">
<link rel="stylesheet" href="static/css/adminTwo.css">
<!-- 新 Bootstrap 核心 CSS 文件 -->
<link rel="stylesheet" href="static/css/bootstrap.min.css">

<!-- jQuery文件。务必在bootstrap.min.js 之前引入 -->
<script src="static/js/jquery.min.js"></script>

<!-- 最新的 Bootstrap 核心 JavaScript 文件 -->
<script src="static/js/bootstrap.min.js"></script>
<style>
span{
	font-weight:700;
	font-size:14px;
	color : rgb(88,99,118);
	line-height : 36px;
	vertical-align: middle;
}
</style>
<title>管理</title>
</head>
<body>
		<% 
			String username = "";
	        if (session.getAttribute("username") == null) {
	    %>
	    <script type="text/javascript">
			alert("您还没有登录，请登录...");
			window.location.href = "SignIn.html"
		</script>
		<%
	        }else{
				username = (String) session.getAttribute("username");
				if(!username.equals("admin")){
					%>
				    <script type="text/javascript">
						alert("您没有权限，请登录...");
						window.location.href = "SignIn.html"
					</script>
					<%
				}
			}
		%>
	<div class="aside" id="sidebar">
		<div class="menu">
			<h2>管理中心</h2>
			<hr class="line-mod">
			<dl class="menu-list def-scroll keyboard-focus-obj">
				<dd data-nav-dropdown="1" tabindex="0" class="">
					<a class="menu-lv2" href="javascript:void(0);" data-event="nav">
						<span>用户</span>
						<i class="white-down-icon">开</i>
					</a>
					<ul class="menu-sub">
						<li ><a href="addUser.jsp" class="menu-lv3" id="addUser" target="frame"><i class="ico-dot"></i><span>添加用户</span></a></li>
						<li ><a href="deleteUser.html" class="menu-lv3" target="frame"><i class="ico-dot" ></i><span>删除用户</span></a></li>
						
					</ul>
				</dd>
				<dd data-nav-dropdown="1" tabindex="0" class="">
					<a class="menu-lv2" href="javascript:void(0);" data-event="nav" ><span>药品</span><i class="white-down-icon">开</i></a>
					<ul class="menu-sub">
						<li ><a href="addMedicine.html" class="menu-lv3" target="frame"><i class="ico-dot"></i><span>添加药品</span></a></li>
						<li ><a href="updateMedicine.html" class="menu-lv3" target="frame"><i class="ico-dot"></i><span>更新药品</span></a></li>
						
					</ul>
				</dd>
				<dd >
					<a class="menu-lv2"  data-event="nav" href="searchPrescription.html;" target="frame"><span>处方</span></a>
				</dd>
				<dd >
					<a class="menu-lv2"  data-event="nav" href="updatePassword.html;" target="frame"><span>修改密码</span></a>
				</dd>
				<dd >
					<a class="menu-lv2"  data-event="nav" href="javascript:void(0);" id="signOut"><span>退出</span></a>
				</dd>
				</dl>
				</div>
				</div>
		<div id="appArea" class="main">
		<iframe id="ifream" src="searchPrescription.html" scrolling='no' frameborder="0" style="padding: 0px; width: 100%; height: 1000px;" name="frame"></iframe>
		</div>
		
	<script>
	$(".menu-lv2").click(function(){
		var classAttr = $(this).parent().attr("class");
		if(classAttr==""){
			$(this).parent().attr("class", "act");
		}else{
			$(this).parent().attr("class", "");
		}
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
	</script>
</body>
</html>