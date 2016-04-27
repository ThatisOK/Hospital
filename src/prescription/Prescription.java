package prescription;

public class Prescription {
	
	private String id;
	private String name;
	private String sex;
	private double age;
	private String dianose;
	private int userid;
	private String time;
	private String doctor;
	private String allergic;
	private String address;
	private double sum;
	public Prescription(String id, String name, String sex, double age, String dianose, int userid, String allergic,String address, double sum){
		this.id = id;
		this.name = name;
		this.sex = sex;
		this.age = age;
		this.dianose = dianose;
		this.userid = userid;
		this.allergic = allergic;
		this.address = address;
		this.sum = sum;
	}
	
	
	public Prescription(String id, String name, String sex, double age, String dianose, String time, String doctor, String allergic, String address, double sum){
		this.id = id;
		this.name = name;
		this.sex = sex;
		this.age = age;
		this.dianose = dianose;
		this.time = time;
		this.doctor = doctor;
		this.allergic = allergic;
		this.address = address;
		this.sum = sum;
	}
	
	public Prescription(String id, String name, String sex, double age, String dianose, String time, int userid, String allergic, String address, double sum){
		this.id = id;
		this.name = name;
		this.sex = sex;
		this.age = age;
		this.dianose = dianose;
		this.time = time;
		this.userid = userid;
		this.allergic = allergic;
		this.address = address;
		this.sum = sum;
	}
	
	public Prescription(){
		
	}
	
	
	
	public String getId() {
		return id;
	}
	public void setId(String id) {
		this.id = id;
	}
	public String getName() {
		return name;
	}
	public void setName(String name) {
		this.name = name;
	}
	public String getSex() {
		return sex;
	}
	public void setSex(String sex) {
		this.sex = sex;
	}
	public double getAge() {
		return age;
	}
	public void setAge(double age) {
		this.age = age;
	}
	public String getDianose() {
		return dianose;
	}
	public void setDianose(String dianose) {
		this.dianose = dianose;
	}

	public int getUserid() {
		return userid;
	}

	public void setUserid(int userid) {
		this.userid = userid;
	}

	public String getTime() {
		return time;
	}

	public void setTime(String time) {
		this.time = time;
	}

	public String getDoctor() {
		return doctor;
	}

	public void setDoctor(String doctor) {
		this.doctor = doctor;
	}


	public String getAllergic() {
		return allergic;
	}


	public void setAllergic(String allergic) {
		this.allergic = allergic;
	}

	public String getAddress() {
		return address;
	}


	public void setAddress(String address) {
		this.address = address;
	}


	public double getSum() {
		return sum;
	}


	public void setSum(double sum) {
		this.sum = sum;
	}
	
	
	

}
