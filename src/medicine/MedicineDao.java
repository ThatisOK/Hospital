package medicine;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;

import org.json.JSONObject;

public class MedicineDao {
	
	public Connection getConn() throws ClassNotFoundException, SQLException {

		Class.forName("com.mysql.jdbc.Driver");  
		String url = "jdbc:mysql://127.0.0.1:3306/hospital";
		Connection conn = DriverManager.getConnection(url, "root", "root");
		return conn;
	}
	
	public ArrayList<Medicine> getMedicineByAcronym(String acronym){
		ArrayList<Medicine> list = new ArrayList<Medicine>();
		try {
			Connection conn = this.getConn();
			Statement stmt = conn.createStatement();
			ResultSet rs = stmt.executeQuery("select * from medicine where acronym like '%"+acronym+"%'");		
			while(rs.next()){
				Medicine medicine = new Medicine();
				medicine.setId(rs.getInt("id"));
				medicine.setName(rs.getString("name"));
				medicine.setBrand(rs.getString("brand"));
				medicine.setStandard(rs.getString("standard"));
				medicine.setPurchasePrice(rs.getDouble("purchase_price"));
				medicine.setRetailPrice(rs.getDouble("retail_price"));
				medicine.setAcronym(rs.getString("acronym"));
				list.add(medicine);
			}
			conn.close();
		} catch (ClassNotFoundException | SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		return list;
	}
	
	public ArrayList<Medicine> getMedicineByName(String medicineName){
		ArrayList<Medicine> list = new ArrayList<Medicine>();
		try {
			Connection conn = this.getConn();
			Statement stmt = conn.createStatement();
			String sql ="select * from medicine where name ='"+medicineName+"'";
			ResultSet rs = stmt.executeQuery(sql);		
			while(rs.next()){
				Medicine medicine = new Medicine();
				medicine.setId(rs.getInt("id"));
				medicine.setName(rs.getString("name"));
				medicine.setBrand(rs.getString("brand"));
				medicine.setStandard(rs.getString("standard"));
				medicine.setPurchasePrice(rs.getDouble("purchase_price"));
				medicine.setRetailPrice(rs.getDouble("retail_price"));
				medicine.setAcronym(rs.getString("acronym"));
				list.add(medicine);
			}
			conn.close();
		} catch (ClassNotFoundException | SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		return list;
	}
	
	public Medicine getMedicineById(int id){
		Medicine medicine = null;
		try {
			Connection conn = this.getConn();
			Statement stmt = conn.createStatement();
			ResultSet rs = stmt.executeQuery("select * from medicine where id="+id);
			if(rs.next()){
				medicine = new Medicine();
				medicine.setId(id);
				medicine.setAcronym(rs.getString("acronym"));
				medicine.setName(rs.getString("name"));
				medicine.setBrand(rs.getString("brand"));
				medicine.setStandard(rs.getString("standard"));
				medicine.setPurchasePrice(rs.getDouble("purchase_price"));
				medicine.setRetailPrice(rs.getDouble("retail_price"));
			}
			conn.close();
		} catch (ClassNotFoundException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		return medicine;
	}
	
	
	public void addMedicine(Medicine m){
		try {
			Connection conn = this.getConn();
			Statement stmt = conn.createStatement();
			String sql = "insert into medicine(name, brand, purchase_price, retail_price, standard, acronym) values('"+m.getName()+"','"+m.getBrand()+"',"+m.getPurchasePrice()+","+m.getRetailPrice()+",'"+m.getStandard()+"','"+m.getAcronym()+"')";
			stmt.execute(sql);
			conn.close();
		} catch (ClassNotFoundException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}
	
	public int updateMedicine(Medicine m){
		int num = 0;
		try {
			Connection conn = this.getConn();
			Statement stmt = conn.createStatement();
			String sql = "update medicine set name='"+m.getName()+"',brand='"+m.getBrand()+"',purchase_price="+m.getPurchasePrice()+",retail_price="+m.getRetailPrice()+",standard='"+m.getStandard()+"',acronym='"+m.getAcronym()+"' where id="+m.getId(); 
			num = stmt.executeUpdate(sql);
			conn.close();
			
		} catch (ClassNotFoundException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		return num;
	}

}
