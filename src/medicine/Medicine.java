package medicine;

public class Medicine {
	
	private int id;
	private String name;
	private String acronym;
	private String brand;
	private String standard;
	private double purchasePrice;
	private double retailPrice;
	private int num;
	
	public Medicine() {}
	
	

	public Medicine(int id, String name, String acronym, String brand, String standard, double purchasePrice, double retailPrice) {
		this.id = id;
		this.name = name;
		this.acronym = acronym;
		this.brand = brand;
		this.standard = standard;
		this.purchasePrice = purchasePrice;
		this.retailPrice = retailPrice;
	}
	
	public Medicine(String name, String acronym, String brand, String standard, double purchasePrice, double retailPrice) {
		this.name = name;
		this.acronym = acronym;
		this.brand = brand;
		this.standard = standard;
		this.purchasePrice = purchasePrice;
		this.retailPrice = retailPrice;
	}
	
	public Medicine(String name,String brand, String standard, double purchasePrice, double retailPrice) {
		this.name = name;
		this.brand = brand;
		this.standard = standard;
		this.purchasePrice = purchasePrice;
		this.retailPrice = retailPrice;
	}
	
	public Medicine(String name,String brand, String standard, double purchasePrice, double retailPrice, int num) {
		this.name = name;
		this.brand = brand;
		this.standard = standard;
		this.purchasePrice = purchasePrice;
		this.retailPrice = retailPrice;
		this.num = num;
	}
	
	public Medicine(String name, String brand, String standard, double retailPrice, int num){
		this.name = name;
		this.brand = brand;
		this.standard = standard;
		this.retailPrice = retailPrice;
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



	public double getPurchasePrice() {
		return purchasePrice;
	}

	public void setPurchasePrice(double purchasePrice) {
		this.purchasePrice = purchasePrice;
	}

	public double getRetailPrice() {
		return retailPrice;
	}



	public void setRetailPrice(double retailPrice) {
		this.retailPrice = retailPrice;
	}



	public int getNum() {
		return num;
	}



	public void setNum(int num) {
		this.num = num;
	}
	
	
	
	

}
