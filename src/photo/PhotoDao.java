package photo;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;


public class PhotoDao {
	
	public Connection getConn() throws ClassNotFoundException, SQLException {

		Class.forName("com.mysql.jdbc.Driver");  
		String url = "jdbc:mysql://127.0.0.1:3306/hospital";
		Connection conn = DriverManager.getConnection(url, "root", "root");
		return conn;
	}
	
	public int addPhoto(Photo p){
		try {
			Connection conn = this.getConn();
			Statement stmt = conn.createStatement();
			String sql = "insert into prescriptionPhoto(prescriptionID, photoPath) values('"+p.getPrescriptionID()+"','"+p.getPhotoPath()+"')";
			stmt.execute(sql);
			conn.close();
		} catch (ClassNotFoundException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		return 0;
	}
	
	public String getPhotoPath(String prescriptionID){
		String photoPath = "";
		try {
			Connection conn = this.getConn();
			Statement stmt = conn.createStatement();
			String sql = " select * from prescriptionPhoto where prescriptionID = '"+ prescriptionID +"'";
			ResultSet rs = stmt.executeQuery(sql);
			if(rs.next()){
				photoPath = rs.getString("photoPath");
			}
			conn.close();
		} catch (ClassNotFoundException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		return photoPath;
	}
	
	public int deleteById(String prescriptionID){
		int result = 0;
		try {
			Connection conn = this.getConn();
			Statement stmt = conn.createStatement();
			String sql = "delete from prescriptionPhoto where prescriptionId = '"+ prescriptionID +"'";
			result = stmt.executeUpdate(sql);
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

}
