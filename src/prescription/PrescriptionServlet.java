package prescription;

import java.io.IOException;
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
import serialnumber.FileEveryDaySerialNumber;
import serialnumber.SerialNumber;
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
		Message message = new Message();
		switch(operation){
		case "add": {
			SerialNumber id = new FileEveryDaySerialNumber(4, "EveryDaySerialNumber.dat");
			String name = request.getParameter("name");
			String sex = request.getParameter("sex");
			int age = Integer.valueOf(request.getParameter("age"));
			String diagnose = request.getParameter("diagnose");
			String userid = request.getParameter("userid");
			String allergic = request.getParameter("allergic");
			String address = request.getParameter("address");
			String medicine_list = request.getParameter("medicine_list");
			double sum = Double.valueOf(request.getParameter("sum"));
			Prescription p = new Prescription(id.getSerialNumber(), name, sex, age, diagnose, Integer.valueOf(userid), allergic, address, sum);
			pd.addPrescription(p, medicine_list);
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
			message.sendJson(response, 0, "删除成功！");
			break;
		}
		}
	}

}
