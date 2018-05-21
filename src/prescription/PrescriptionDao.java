package prescription;
 
import java.sql.*;
import java.util.*;

import medicine.Medicine;

public class PrescriptionDao {
	
	public Connection getConn() throws ClassNotFoundException, SQLException {

		Class.forName("com.mysql.jdbc.Driver");  
		String url = "jdbc:mysql://127.0.0.1:3306/hospital";
		Connection conn = DriverManager.getConnection(url, "root", "root");
		return conn;
	}
	
	public void addPrescription(Prescription p, String medicine){
		String[] list = medicine.split(":");
		int length = list.length;
		String[] queries = new String[length/2];
		for(int i=0; i<length; i=i+2){
			queries[i/2] = "insert into prescriptionMedicine(prescriptionId, medicineId, num) values('"+p.getId()+"',"+list[i]+","+list[i+1]+")";
		}
		try {
			Connection conn = this.getConn();
			Statement stmt = conn.createStatement();
			String sql = "insert into prescription(id,name,sex,age,dianose,userid, allergic, sum, address) values('"+p.getId()+"','"+p.getName()+"','"+p.getSex()+"',"+p.getAge()+",'"+p.getDianose()+"',"+p.getUserid()+",'"+p.getAllergic()+"',"+p.getSum()+", '"+p.getAddress()+"')";
			stmt.execute(sql);
			for(String query : queries){
				stmt.addBatch(query);
			}
			stmt.executeBatch();
			conn.close();
		} catch (ClassNotFoundException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}
	
	public ArrayList<Prescription> searchPrescription(String patient, int page,int pageSize){
		ArrayList<Prescription> list = new ArrayList<Prescription>();
		try {
			Connection conn = this.getConn();
			Statement stmt = conn.createStatement();
			String sql = " select * from prescription p join user u on p.userid=u.id where name like '"+patient+"%' order by p.id asc limit "+ (page - 1) * pageSize + "," +pageSize;
			ResultSet rs = stmt.executeQuery(sql);
			while(rs.next()){
				Prescription p = new Prescription(rs.getString("id"),rs.getString("name"), rs.getString("sex"), rs.getDouble("age"),rs.getString("dianose"), rs.getString("time").trim(), rs.getString("username"), rs.getString("allergic"), rs.getString("address"), rs.getDouble("sum"));
				list.add(p);
			}	
			conn.close();
		} catch (ClassNotFoundException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		return list;
	}
	
	public ArrayList<Prescription> searchPrescription(String from, String to, int page,int pageSize){
		ArrayList<Prescription> list = new ArrayList<Prescription>();
		try {
			Connection conn = this.getConn();
			Statement stmt = conn.createStatement();
			//String sql = " select * from prescription p join user u on p.userid=u.id where p.time>='"+from+"' and p.time<= '"+to+"' and p.id >=(select id from prescription where p.time>='"+from+"' and p.time<= '"+to+"' order by id asc limit "+(page-1)*pageSize+", 1) order by p.id asc limit "+pageSize;
			String sql = "select * from prescription p join user u on p.userid=u.id where p.time>='"+from+"' and p.time<= '"+to+"' order by p.id asc limit "+ (page - 1) * pageSize + "," +pageSize ;
			ResultSet rs = stmt.executeQuery(sql);
			while(rs.next()){
				Prescription p = new Prescription(rs.getString("id"),rs.getString("name"), rs.getString("sex"), rs.getDouble("age"),rs.getString("dianose"), rs.getString("time").trim(), rs.getString("username"), rs.getString("allergic"), rs.getString("address"), rs.getDouble("sum") );
				list.add(p);
			}	
			conn.close();
		} catch (ClassNotFoundException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		return list;
	}
	
	public ArrayList<Prescription> searchPrescription(String patient, String from, String to, int page,int pageSize){
		ArrayList<Prescription> list = new ArrayList<Prescription>();
		try {
			Connection conn = this.getConn();
			Statement stmt = conn.createStatement();
			String sql = " select * from prescription p join user u on p.userid=u.id where p.time>='"+from+"' and p.time<= '"+to+"' and name like'"+patient+"%' order by p.id asc limit " + (page - 1) * pageSize + "," +pageSize;
			ResultSet rs = stmt.executeQuery(sql);
			while(rs.next()){
				Prescription p = new Prescription(rs.getString("id"),rs.getString("name"), rs.getString("sex"), rs.getDouble("age"),rs.getString("dianose"), rs.getString("time").trim(), rs.getString("username"), rs.getString("allergic"), rs.getString("address"), rs.getDouble("sum") );
				list.add(p);
			}	
			conn.close();
		} catch (ClassNotFoundException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		return list;
	}
	
	public ArrayList<Medicine> getPrescriptionMedicine(String id){
		ArrayList<Medicine> list = new ArrayList<Medicine>();
		try {
			Connection conn = this.getConn();
			Statement stmt = conn.createStatement();
			String sql = " select m.id, name, brand, retail_price, standard, num from prescriptionMedicine p join medicine m on medicineId=m.id where prescriptionId='"+id+"'";
			ResultSet rs = stmt.executeQuery(sql);
			while(rs.next()){
				Medicine m = new Medicine(rs.getInt("m.id"), rs.getString("name"), rs.getString("brand"), rs.getString("standard"), rs.getDouble("retail_price"), rs.getInt("num"));
				list.add(m);
			}	
			conn.close();
		} catch (ClassNotFoundException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		return list;
	}
	
	public int getToatlCounts(String patient){
		int total = 0;
		try {
			Connection conn = this.getConn();
			Statement stmt = conn.createStatement();
			String sql = "select count(*) from prescription where name like'"+patient+"%'";
			ResultSet rs = stmt.executeQuery(sql);
			while(rs.next()){
				total = rs.getInt(1);
			}
			conn.close();
		} catch (ClassNotFoundException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		return total;
		
	}
	
	public int getToatlCounts(String from, String to){
		int total = 0;
		try {
			Connection conn = this.getConn();
			Statement stmt = conn.createStatement();
			String sql = "select count(*) from prescription where time>='"+from+"' and time <= '"+to+"'";
			ResultSet rs = stmt.executeQuery(sql);
			while(rs.next()){
				total = rs.getInt(1);
			}
			conn.close();
		} catch (ClassNotFoundException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		return total;
		
	}
	
	public int getToatlCounts(String patient, String from, String to){
		int total = 0;
		try {
			Connection conn = this.getConn();
			Statement stmt = conn.createStatement();
			String sql = "select count(*) from prescription where time>='"+from+"' and time <= '"+to+"' and name like '"+patient+"%'";
			ResultSet rs = stmt.executeQuery(sql);
			while(rs.next()){
				total = rs.getInt(1);
			}
			conn.close();
		} catch (ClassNotFoundException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		return total;
		
	}
	
	public int deleteById(String prescriptionId){
		int result = 0;
		try {
			Connection conn = this.getConn();
			Statement stmt = conn.createStatement();
			String sql = "delete from prescriptionMedicine where prescriptionId = '"+ prescriptionId +"'";
			result = stmt.executeUpdate(sql);
			result = stmt.executeUpdate("delete from prescription where id = '"+prescriptionId+"'");
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
	
	public Prescription getPrescriptionById(String id){
		Prescription p = new Prescription();
		try {
			Connection conn = this.getConn();
			Statement stmt = conn.createStatement();
			String sql = "select * from prescription where id = '"+ id +"'";
			ResultSet rs = stmt.executeQuery(sql);
			if(rs.next()){
				p.setId(id);
				p.setName(rs.getString("name"));
				p.setSex(rs.getString("sex"));
				p.setAge(rs.getDouble("age"));
				p.setDianose(rs.getString("dianose"));
				p.setAllergic(rs.getString("allergic"));
				p.setSum(rs.getDouble("sum"));
				p.setAddress(rs.getString("address"));
				p.setTime(rs.getString("time"));
				p.setUserid(rs.getInt("userid"));
			}
			conn.close();
		} catch (ClassNotFoundException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		return p;
	}
	
	public int updatePrescription(Prescription p){
		int result = 0;
		try {
			Connection conn = this.getConn();
			Statement stmt = conn.createStatement();
			String sql = "update prescription set name='"+p.getName()+"', sex='"+p.getSex()+"', age="+p.getAge()+", dianose='"+p.getDianose()+"', allergic = '"+p.getAllergic()+"', sum="+p.getSum()+", address='"+p.getAddress()+"' where id='"+p.getId()+"'";
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
	
	public String getMonthSum(String date){
		double sum = 0;
		int count = 0;
		String from  = date + "-01";
		String to = date + "-31";
		try {
			Connection conn = this.getConn();
			Statement stmt = conn.createStatement();
			String sql = "select sum(sum), count(*) from prescription where time>='"+from+"' and time <= '"+to+"'";
			ResultSet rs = stmt.executeQuery(sql);
			if(rs.next()){
				sum = rs.getDouble(1);
				count = rs.getInt(2);
			}		
			conn.close();
		} catch (ClassNotFoundException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		return sum+"-"+count;
	}

	
	


}
