package photo;

public class Photo {
	
	private String photoPath;
	private String prescriptionID;
	
	public Photo(){}
	
	public Photo(String photoPath, String prescriptionID){
		this.photoPath = photoPath;
		this.prescriptionID = prescriptionID;
	}
	public String getPhotoPath() {
		return photoPath;
	}
	public void setPhotoPath(String photoPath) {
		this.photoPath = photoPath;
	}
	public String getPrescriptionID() {
		return prescriptionID;
	}
	public void setPrescriptionID(String prescriptionID) {
		this.prescriptionID = prescriptionID;
	}
	
	

}
