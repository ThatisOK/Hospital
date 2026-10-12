package user;
import java.sql.*;
public class UserDao {
 public Connection getConn() throws Exception {
  Class.forName("com.mysql.jdbc.Driver");
  String url = "jdbc:mysql://127.0.0.1:3306/clinic";
  Connection conn = DriverManager.getConnection(url, "fixture", "fixture");
  return conn;
 }
}
