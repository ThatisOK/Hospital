package medicine;

import java.io.IOException;
import java.util.ArrayList;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

import org.json.JSONStringer;

import com.sun.org.apache.bcel.internal.classfile.Synthetic;

import net.sf.json.JSONObject;
import tool.Message;
/**
 * Servlet implementation class MedicineServlet
 */
@WebServlet("/MedicineServlet")
public class MedicineServlet extends HttpServlet {
	private static final long serialVersionUID = 1L;
       
    /**
     * @see HttpServlet#HttpServlet()
     */
    public MedicineServlet() {
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
		String operation = request.getParameter("operation");
		Message message = new Message();
		MedicineDao md = new MedicineDao();
		HttpSession session = request.getSession();
		response.setContentType("application/json;charset=UTF-8");
		switch(operation){
			case "search" : {
				String name = request.getParameter("name").toUpperCase();
				ArrayList<Medicine> medicineList = md.getMedicineByAcronym(name);		
				if(medicineList.isEmpty()){
					JSONObject error = JSONObject.fromObject("{\"error\":\"error\"}");
					response.getWriter().write(error.toString());
				}else{
					String json = message.arraylistToJson(medicineList);
					response.getWriter().write(json);
				}	
				break;
			}
			case "confirm":{
				String data = request.getParameter("data");
				String[] dataToString = data.split(";");
				ArrayList<Medicine> list = new ArrayList<Medicine>();
				for(int i=0; i<dataToString.length; i++){
					int id = Integer.valueOf(dataToString[i]);
					list.add(md.getMedicineById(id));
				}
				String result = message.arraylistToJson(list);
				response.getWriter().write(result);
				break;
			}
			case "add":{
				String name = request.getParameter("name");
				String acronym = request.getParameter("acronym").toUpperCase();
				String brand = request.getParameter("brand");
				String standard = request.getParameter("standard");
				double purchasePrice = Double.valueOf(request.getParameter("purchase_price"));
				double retailPrice = Double.valueOf(request.getParameter("retail_price"));
				Medicine medicine = new Medicine(name, acronym, brand, standard, purchasePrice, retailPrice);
				md.addMedicine(medicine);
				message.sendJson(response, 0, "添加成功");
				break;
					
			}
			case "search-update":{
				String acronym = request.getParameter("acronym");
				ArrayList<Medicine> medicineList = md.getMedicineByAcronym(acronym);
				if(medicineList.size()>0){
					String json = message.arraylistToJson(medicineList);
					response.getWriter().write(json);
				}else{
					JSONObject error = JSONObject.fromObject("{\"error\":\"error\"}");
					response.getWriter().write(error.toString());
				}
				break;
			}
			case "search-medicine":{
				String id = request.getParameter("id");
				Medicine medicine = md.getMedicineById(Integer.valueOf(id));
				ArrayList<Medicine> list = new ArrayList<>();
				list.add(medicine);
				if(list.size()>0){
					String json = message.arraylistToJson(list);
					response.getWriter().write(json);
				}else{
					JSONObject error = JSONObject.fromObject("{\"error\":\"error\"}");
					response.getWriter().write(error.toString());
				}
				break;
			}
			
			case "update":{
				int id = Integer.valueOf(request.getParameter("id"));
				String name = request.getParameter("name");
				String acronym = request.getParameter("acronym").toUpperCase();
				String brand = request.getParameter("brand");
				String standard = request.getParameter("standard");
				double purchasePrice = Double.valueOf(request.getParameter("purchase_price"));
				double retailPrice = Double.valueOf(request.getParameter("retail_price"));
				Medicine m = new Medicine(id, name, acronym, brand, standard, purchasePrice, retailPrice);
				JSONObject state = null;
				if(md.updateMedicine(m) > 0){
					state = JSONObject.fromObject("{\"success\":\"更新成功\"}");
				}else{
					state = JSONObject.fromObject("{\"success\":\"更新失败\"}");
					
				}
				response.getWriter().write(state.toString());
				break;
			}
		}
		
	}

}
