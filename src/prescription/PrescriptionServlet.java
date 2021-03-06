package prescription;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.text.*;
import java.util.*;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

import medicine.Medicine;
import net.sf.json.JSONArray;
import net.sf.json.JSONObject;
import photo.Photo;
import photo.PhotoDao;
import serialnumber.FileEveryDaySerialNumber;
import serialnumber.SerialNumber;
import sun.misc.BASE64Decoder;
import tool.Message;

/**
 * Servlet implementation class PrescriptionServlet
 */
@WebServlet("/PrescriptionServlet")
public class PrescriptionServlet extends HttpServlet {
	private static final long serialVersionUID = 1L;
       
    /**
     * @see HttpServlet#HttpServlet()
     */
    public PrescriptionServlet() {
        super();
        // TODO Auto-generated constructor stub
    }

	/**
	 * @see HttpServlet#doGet(HttpServletRequest request, HttpServletResponse response)
	 */
	protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		// TODO Auto-generated method stub
		response.getWriter().append("Served at: ").append(request.getContextPath());
	}

	/**
	 * @see HttpServlet#doPost(HttpServletRequest request, HttpServletResponse response)
	 */
	protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		// TODO Auto-generated method stub
		request.setCharacterEncoding("utf-8");
		response.setCharacterEncoding("utf-8");
		String operation = request.getParameter("operation");
		PrescriptionDao pd = new PrescriptionDao();
		PhotoDao photoDao = new PhotoDao();
		Message message = new Message();
		HttpSession session = request.getSession();
		switch(operation){
		case "add": {
			SerialNumber id = new FileEveryDaySerialNumber(4, "EveryDaySerialNumber.dat");
			String prescriptionNum = id.getSerialNumber();
			String name = request.getParameter("name");
			String sex = request.getParameter("sex");
			double age = Double.valueOf(request.getParameter("age"));
			String diagnose = request.getParameter("diagnose");
			String userid = request.getParameter("userid");
			String allergic = request.getParameter("allergic");
			String address = request.getParameter("address");
			String medicine_list = request.getParameter("medicine_list");
			if (medicine_list.isEmpty()) {
				medicine_list = "";
			}
			String sum = request.getParameter("sum");
			if (sum.isEmpty()) {
				sum = "";
			}
			Prescription p = new Prescription(prescriptionNum, name, sex, age, diagnose, Integer.valueOf(userid), allergic, address, Double.valueOf(sum));
			pd.addPrescription(p, medicine_list);
			Object photoPath = session.getAttribute("photoPath");
			if (photoPath != null) {
				photoPath = photoPath.toString();
				Photo photo = new Photo(session.getAttribute("photoPath").toString(), prescriptionNum);
				photoDao.addPhoto(photo);
				session.removeAttribute("photoPath");
			}
			JSONObject error = JSONObject.fromObject("{\"state\":\"success\"}");
			response.getWriter().write(error.toString());
			break;
			}
		case "search":{
			String patient = request.getParameter("patient");
			String[] date = request.getParameter("date").split("至");
			String type = request.getParameter("type");
			int page = Integer.valueOf(request.getParameter("page"));
			int pageSize = Integer.valueOf(request.getParameter("pageSize"));
			if(type.equals("1")){
				ArrayList<Prescription> list = pd.searchPrescription(patient, page, pageSize);
				int totalCounts = pd.getToatlCounts(patient);
				if(list.size()>0){
					JSONObject json = new JSONObject();
					json.put("totalCounts", totalCounts);
					json.put("list", JSONArray.fromObject(list));
					response.getWriter().write(json.toString());
				}
			}else if(type.equals("2")){
				String from = date[0]+ " 00:00:00";
				String to = date[1] +" 00:00:00";
				ArrayList<Prescription> list = pd.searchPrescription(from, to, page, pageSize);
				int totalCounts = pd.getToatlCounts(from, to);
				if(list.size()>0){
					JSONObject json = new JSONObject();
					json.put("totalCounts", totalCounts);
					json.put("list", JSONArray.fromObject(list));
					response.getWriter().write(json.toString());
				}	
			}else if(type.equals("3")){
				String from = date[0]+ " 00:00:00";
				String to = date[1] +" 00:00:00";
				ArrayList<Prescription> list = pd.searchPrescription(patient, from, to, page, pageSize);
				int totalCounts = pd.getToatlCounts(patient, from, to);
				if(list.size()>0){
					JSONObject json = new JSONObject();
					json.put("totalCounts", totalCounts);
					json.put("list", JSONArray.fromObject(list));
					response.getWriter().write(json.toString());
				}	
			}
			}
		case "prescriptionInfo":{
			String id = request.getParameter("id");
			ArrayList<Medicine> list = pd.getPrescriptionMedicine(id);
			if(list.size()>0){
				String json = message.arraylistToJson(list);
				response.getWriter().write(json);
			}
			break;
		}
		case "delete":{
			String id = request.getParameter("id");
			pd.deleteById(id);
			String photoPath = photoDao.getPhotoPath(id);
			File file = new File(request.getSession().getServletContext().getRealPath("/") + photoPath);
		    // 如果文件路径所对应的文件存在，并且是一个文件，则直接删除
			if (file.exists() && file.isFile()) {
				file.delete();
			}
			photoDao.deleteById(id);
			message.sendJson(response, 0, "删除成功！");
			break;
		}
		case "get":{
			String id = request.getParameter("id");
			Prescription p = pd.getPrescriptionById(id);
			ArrayList<Medicine> medicineList = pd.getPrescriptionMedicine(id);
			JSONArray medicineJson = JSONArray.fromObject(medicineList);
			JSONObject json = JSONObject.fromObject(p);
			JSONObject returnJson = new JSONObject();
			returnJson.put("info", json);
			returnJson.put("medicine", medicineJson);
			response.getWriter().write(returnJson.toString());
			break;
		}
		case "update":{
			String id = request.getParameter("id");
			String name = request.getParameter("name");
			String sex = request.getParameter("sex");
			double age = Double.valueOf(request.getParameter("age"));
			String diagnose = request.getParameter("dianose");
			String userid = request.getParameter("userid");
			String allergic = request.getParameter("allergic");
			String address = request.getParameter("address");
			double sum = Double.valueOf(request.getParameter("sum"));
			String time =  request.getParameter("time");
			Prescription p = new Prescription(id, name, sex, age, diagnose,time,  Integer.valueOf(userid), allergic, address, sum);
			int result = pd.updatePrescription(p);
			message.sendJson(response, 0, "修改成功！");
			break;
		}
		case "monthSum":{
			String date = request.getParameter("date");
			String[] result= pd.getMonthSum(date).split("-");
			JSONObject json = JSONObject.fromObject("{\"sum\":"+result[0]+";\"count\":"+result[1]+"}");
			response.getWriter().write(json.toString());
			break;
		}
		case "upload":{
			DateFormat df = new SimpleDateFormat("yyyyMMddHHmmss");
			Calendar calendar = Calendar.getInstance();
			String dateName = df.format(calendar.getTime());
			String basePath = "photos/" + dateName.substring(0, 8) + "/";
			String filePath = request.getSession().getServletContext().getRealPath("/") + basePath;
			String fileName = dateName + ".png";
			String imgStr = request.getParameter("image");
			if (imgStr != null) {
		        imgStr = imgStr.substring(imgStr.indexOf(",") + 1);
		    }
		    Boolean flag = GenerateImage(imgStr, filePath, fileName);
		    String photoPath = "";
		    if (flag) {
		    	photoPath = basePath + fileName;
		    }
		    session.setAttribute("photoPath", photoPath);
		    message.sendJson(response, 0, "保存成功");
		}
		}
	}
	
	public boolean GenerateImage(String imgStr, String filePath, String fileName) {
	    try {
	        if (imgStr == null) {
	            return false;
	        }
	        BASE64Decoder decoder = new BASE64Decoder();
	        //Base64解码
	        byte[] b = decoder.decodeBuffer(imgStr);
	        //如果目录不存在，则创建
	        File file = new File(filePath);
	        if (!file.exists()) {
	            file.mkdirs();
	        }
	        //生成图片
	        OutputStream out = new FileOutputStream(filePath + fileName);
	        out.write(b);
	        out.flush();
	        out.close();
	        return true;
	    } catch (Exception e) {
	        //logger.error("生成图片异常：{}", e.getMessage());
	    	System.out.println("生成图片异常：{}" + e.getMessage());
	        return false;
	    }
	}


}
