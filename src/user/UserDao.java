package user;

import java.sql.*;
import java.util.Random;
import tool.RandomId;

public class UserDao {
	
	public Connection getConn() throws ClassNotFoundException, SQLException {

		Class.forName("com.mysql.jdbc.Driver");  
		String url = "jdbc:mysql://127.0.0.1:3306/hospital";
		Connection conn = DriverManager.getConnection(url, "root", "root");
		return conn;
	}
	
	public String userLogin(String username){
		Connection conn = null;
		String result = "";
		try {
			conn = this.getConn();
			Statement stmt = conn.createStatement();
			String sql = "select * from user where username='"+username+"'";
			ResultSet rs = stmt.executeQuery(sql);
			if(rs.next())
				result = rs.getString("password");
			conn.close();
		} catch (ClassNotFoundException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		return result;
	}
	
	public String getIdByUsername(String username){
		String id = "";
		Connection conn = null;
		try {
			conn = this.getConn();
			Statement stmt = conn.createStatement();
			String sql = "select * from user where username='"+username+"'";
			ResultSet rs = stmt.executeQuery(sql);
			if(rs.next())
				id = rs.getString("id");
			conn.close();
		} catch (ClassNotFoundException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		return id;
		
	}
	
	public void userAdd(String username, String password){
		try {
			Connection conn = this.getConn();
			Statement stmt = conn.createStatement();
			String sql = "insert into user(username, password) values('"+username+"','"+password+"')";
			stmt.execute(sql);
			conn.close();
		}catch (ClassNotFoundException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}catch (SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		
	}
	
	public void userDelete(String username){
		try {
			Connection conn = this.getConn();
			Statement stmt = conn.createStatement();
			String sql = "delete from user where username='"+username+"'";
			stmt.execute(sql);
			conn.close();
		}catch (ClassNotFoundException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}catch (SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}
	
	public int updatePassword(int id, String old, String newp){
		int num = 0;
		try {
			Connection conn = this.getConn();
			Statement stmt = conn.createStatement();
			String sql = "update user set password='"+newp+"' where id="+id+" and password='"+old+"'";
			num = stmt.executeUpdate(sql);
			conn.close();
		}catch (ClassNotFoundException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}catch (SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		return num;
		
	}

}
