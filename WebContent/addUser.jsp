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

<!-- 最新的 Bootstrap 核心 JavaScript 文件 -->
<script src="static/js/bootstrap.min.js"></script>
<style>
.form-horizontal{
	width: 300px; 
	margin: 15% 0 0 30%;
}
.btn-primary{
	width : 220px;
}
</style>
<title>添加用户</title>
</head>
<body>
	<form class="form-horizontal" >
	  <div class="form-group">
	    <label for="inputEmail3" class="col-sm-3 control-label">姓名</label>
	    <div class="col-sm-9">
	      <input type="text" class="form-control" id="username">
	    </div>
	  </div>
	  <div class="form-group">
	    <label for="inputPassword3" class="col-sm-3 control-label">密码</label>
	    <div class="col-sm-9">
	      <input type="text" class="form-control" id="password">
	    </div>
	  </div>
	  <div class="form-group">
	    <div class="col-sm-offset-3 col-sm-10">
	      <button type="submit" class="btn btn-primary" id="confirm">确定</button>
	    </div>
	  </div>
	</form>
	<script>
		$("#confirm").click(function(){
			var username = $("#username").val();
			var password = $("#password").val();
			if(username != "" && password != ""){
				$.ajax({
					url:"UserServlet",
					data:{
						username:username,
						password:password,
						operation:"signUp"
					},
					type : "post",
					dataType : "json",
					async:false,
					success : function(data) {
						alert("添加成功");
					}
				})
			}else{
				alert("填写正确信息");
			}	
		})
	</script>
</body>
</html>