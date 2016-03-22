package medicine;

public class Medicine {
	
	private int id;
	private String name;
	private String acronym;
	private String brand;
	private String standard;
	private double price;
	private int num;
	
	public Medicine() {}
	
	

	public Medicine(int id, String name, String acronym, String brand, String standard, double price) {
		this.id = id;
		this.name = name;
		this.acronym = acronym;
		this.brand = brand;
		this.standard = standard;
		this.price = price;
	}
	
	public Medicine(String name, String acronym, String brand, String standard, double price) {
		this.name = name;
		this.acronym = acronym;
		this.brand = brand;
		this.standard = standard;
		this.price = price;
	}
	
	public Medicine(String name,String brand, String standard, double price) {
		this.name = name;
		this.brand = brand;
		this.standard = standard;
		this.price = price;
	}
	
	public Medicine(String name,String brand, String standard, double price, int num) {
		this.name = name;
		this.brand = brand;
		this.standard = standard;
		this.price = price;
		this.num = num;
	}

	public int getId(){
		return this.id;
	}
	
	public void setId(int id){
		this.id = id;
	}


	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getAcronym() {
		return acronym;
	}



	public void setAcronym(String acronym) {
		this.acronym = acronym;
	}



	public String getBrand() {
		return brand;
	}

	public void setBrand(String brand) {
		this.brand = brand;
	}

	public String getStandard() {
		return standard;
	}



	public void setStandard(String standard) {
		this.standard = standard;
	}



	public double getPrice() {
		return price;
	}

	public void setPrice(double price) {
		this.price = price;
	}



	public int getNum() {
		return num;
	}



	public void setNum(int num) {
		this.num = num;
	}
	
	
	
	

}
